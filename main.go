package main

import (
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/bwmarrin/discordgo"
	"github.com/bytedance/sonic"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/go-resty/resty/v2"
	"github.com/golang-jwt/jwt/v5"
	_types "github.com/zishang520/engine.io-go-parser/types"
	"github.com/zishang520/engine.io/v2/types"
	"github.com/zishang520/socket.io/v2/socket"
)

type (
	CreateMessage struct {
		Content string `json:"content"`
	}

	Error struct {
		Detail string `json:"detail"`
	}

	Message struct {
		CreateMessage
		MessageID string `json:"message_id"`
		Sender    Sender `json:"sender"`
		SentAt    int64  `json:"sent_at"`
	}

	Sender int

	TokenClaims struct {
		ThreadId   string `json:"thread_id"`
		ThreadName string `json:"thread_name"`
		jwt.RegisteredClaims
	}

	TurnstileResponse struct {
		Success bool `json:"success"`
	}
)

const (
	Owner Sender = iota
	Visitor
)

func getEnv(name string) string {
	envVar := os.Getenv(name)
	return strings.TrimSpace(envVar)
}

var (
	BOT_TOKEN            = getEnv("BOT_TOKEN")
	CHANNEL_ID           = getEnv("CHANNEL_ID")
	CORS_ALLOW_ORIGINS   = getEnv("CORS_ALLOW_ORIGINS")
	GUILD_ID             = getEnv("GUILD_ID")
	JWT_SECRET           = getEnv("JWT_SECRET")
	TURNSTILE_SECRET_KEY = getEnv("TURNSTILE_SECRET_KEY")
	broadcastChannels    sync.Map
	httpClient           = resty.New()
)

func main() {
	for _, v := range []string{BOT_TOKEN, CHANNEL_ID, CORS_ALLOW_ORIGINS, GUILD_ID, JWT_SECRET} {
		if v == "" {
			log.Fatalf("Environment variables cannot be empty.")
		}
	}

	dg, err := discordgo.New("Bot " + BOT_TOKEN)
	if err != nil {
		log.Fatalf("Error creating Discord session: %v", err)
		return
	}

	dg.Identify.Intents = discordgo.IntentsGuildMessages | discordgo.IntentMessageContent

	dg.AddHandler(func(s *discordgo.Session, m *discordgo.MessageCreate) {
		if m.Author.ID == s.State.User.ID {
			return
		}

		msg := Message{
			CreateMessage: CreateMessage{
				Content: m.Content,
			},
			MessageID: m.Message.ID,
			Sender:    Owner,
			SentAt:    m.Message.Timestamp.Unix(),
		}

		jsonData, err := sonic.Marshal(msg)
		if err == nil {
			if val, ok := broadcastChannels.Load(m.ChannelID); ok {
				broadcastCh := val.(chan []byte)
				broadcastCh <- jsonData
			}
		}
	})

	err = dg.Open()
	if err != nil {
		log.Fatalf("Error opening connection to Discord: %v", err)
	}
	defer dg.Close()

	allowOrigins := []string{}
	for _, v := range strings.Split(CORS_ALLOW_ORIGINS, ",") {
		if v == "*" {
			allowOrigins = []string{"*"}
			break
		}

		parsedURL, err := url.Parse(v)
		if err == nil && parsedURL.Host != "" {
			allowOrigins = append(allowOrigins, fmt.Sprintf("%s://%s", parsedURL.Scheme, parsedURL.Hostname()))
		}
	}

	c := socket.DefaultServerOptions()

	c.SetCors(&types.Cors{
		Origin:            "*",
		Methods:           "*",
		AllowedHeaders:    []string{},
		Credentials:       false,
		PreflightContinue: true,
	})

	io := socket.NewServer(nil, c)
	skt := io.ServeHandler(c)

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     allowOrigins,
		AllowMethods:     []string{"*"},
		AllowHeaders:     []string{},
		AllowCredentials: false,
	}))

	r.GET("/socket.io/", gin.WrapH(skt))
	r.POST("/socket.io/", gin.WrapH(skt))

	r.GET("/startChat", func(ctx *gin.Context) {
		turnstileToken := ctx.Query("turnstileToken")

		if len(TURNSTILE_SECRET_KEY) > 0 {
			var result TurnstileResponse
			_, err := httpClient.R().
				SetFormData(map[string]string{
					"secret":   TURNSTILE_SECRET_KEY,
					"response": turnstileToken,
				}).
				SetResult(&result).
				Post("https://challenges.cloudflare.com/turnstile/v0/siteverify")

			if err != nil {
				ctx.JSON(http.StatusInternalServerError, Error{Detail: "Internal server error."})
				return
			}

			if !result.Success {
				ctx.JSON(http.StatusTooManyRequests, Error{Detail: "Captcha verification failed."})
				return
			}
		}

		now := time.Now()
		exp := now.Add(time.Hour)

		chat := TokenClaims{
			ThreadName: GetRandomName(),
			RegisteredClaims: jwt.RegisteredClaims{
				IssuedAt:  jwt.NewNumericDate(now),
				ExpiresAt: jwt.NewNumericDate(exp),
			},
		}

		if len(chat.ThreadId) == 0 {
			message, err := dg.ChannelMessageSend(CHANNEL_ID, "New Chat")
			if err != nil {
				ctx.JSON(http.StatusInternalServerError, Error{Detail: "Internal server error."})
				return
			}

			t, err := dg.MessageThreadStart(CHANNEL_ID, message.ID, chat.ThreadName, 60)
			if err != nil {
				ctx.JSON(http.StatusInternalServerError, Error{Detail: "Internal server error."})
				return
			}
			chat.ThreadId = t.ID
		}

		var m map[string]interface{}
		buf, _ := sonic.Marshal(chat)
		sonic.Unmarshal(buf, &m)
		claims := jwt.MapClaims{}
		for field, val := range m {
			claims[field] = val
		}

		jwtToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(JWT_SECRET))
		if err != nil {
			ctx.JSON(http.StatusBadRequest, Error{Detail: "Invalid JWT token."})
			return
		}

		ctx.String(http.StatusOK, jwtToken)
	})

	go r.Run(":8080")

	io.On("connection", func(clients ...any) {
		client := clients[0].(*socket.Socket)

		jwts := client.Handshake().Query["jwt"]

		if len(jwts) == 0 {
			client.Disconnect(true)
			return
		}

		tokenStr := jwts[0]
		if len(tokenStr) == 0 {
			client.Disconnect(true)
			return
		}

		token, err := jwt.ParseWithClaims(tokenStr, &TokenClaims{}, func(token *jwt.Token) (interface{}, error) {
			return []byte(JWT_SECRET), nil
		})
		if err != nil || !token.Valid {
			client.Disconnect(true)
			return
		}

		claims, ok := token.Claims.(*TokenClaims)
		if !ok {
			client.Disconnect(true)
			return
		}

		if val, ok := broadcastChannels.LoadAndDelete(claims.ThreadId); ok {
			broadcastCh := val.(chan []byte)
			broadcastCh <- []byte{}
		}

		broadcastCh := make(chan []byte)
		broadcastChannels.Store(claims.ThreadId, broadcastCh)

		go func() {
			for {
				jsonData := <-broadcastCh

				if len(jsonData) == 0 {
					client.Disconnect(true)
					break
				}

				err := client.Emit("message", jsonData)
				if err != nil {
					client.Disconnect(true)
					break
				}
			}
		}()

		client.On("message", func(datas ...any) {
			for _, data := range datas {
				switch v := data.(type) {
				case _types.BufferInterface:
					{
						byteData := v.Bytes()

						var cm CreateMessage
						if err := sonic.Unmarshal(byteData, &cm); err != nil {
							log.Println("Failed to process the incoming message.")
							continue
						}

						m, err := dg.ChannelMessageSend(claims.ThreadId, cm.Content)
						if err != nil {
							log.Printf("Error sending message to Discord thread: %v", err)
							continue
						}

						msg := Message{
							CreateMessage: cm,
							MessageID:     m.ID,
							Sender:        Visitor,
							SentAt:        m.Timestamp.Unix(),
						}

						jsonData, err := sonic.Marshal(msg)
						if err == nil {
							broadcastCh <- jsonData
						}
					}
				}
			}
		})

		client.On("disconnect", func(datas ...any) {
			broadcastChannels.Delete(claims.ThreadId)
		})
	})

	exit := make(chan struct{})
	SignalC := make(chan os.Signal, 1)

	signal.Notify(SignalC, os.Interrupt, syscall.SIGHUP, syscall.SIGINT, syscall.SIGTERM, syscall.SIGQUIT)
	go func() {
		for s := range SignalC {
			switch s {
			case os.Interrupt, syscall.SIGHUP, syscall.SIGINT, syscall.SIGTERM, syscall.SIGQUIT:
				close(exit)
				return
			}
		}
	}()

	<-exit
	io.Close(nil)
	os.Exit(0)
}

var words = [...]string{
	"agree", "aim", "amused", "ankle", "argue", "assist", "attend", "autumn", "bag", "best", "blind", "boss", "broom", "camera", "canyon", "cargo", "club", "common", "coral", "cost", "cotton", "coyote", "crash", "cube", "curve", "diagram", "dinner", "display", "draft", "dutch", "egg", "elder", "erode", "escape", "example", "exist", "few", "figure", "find", "fitness", "fold", "fuel", "genius", "ginger", "govern", "gown", "grit", "guitar", "hedgehog", "high", "hockey", "hopeful", "humor", "ice", "idle", "increase", "injury", "isolate", "jewel", "kind", "kitten", "lab", "laundry", "lava", "leaf", "loan", "lottery", "lucid", "lumber", "luxury", "magnet", "main", "mansion", "marble", "neutral", "optimistic", "option", "palace", "pause", "peanut", "pelican", "pet", "plate", "pride", "priority", "proud", "purity", "quarter", "rapid", "raven", "report", "rich", "rough", "royal", "rubber", "scissors", "sea", "search", "shallow", "shed", "silver", "sister", "sleep", "slide", "small", "smile", "snap", "solid", "squeeze", "story", "sun", "sword", "talk", "taxi", "they", "today", "travel", "typical", "unable", "universe", "vendor", "visa", "web", "when", "win", "winner", "woman", "wonderful",
}

func GetRandomName() string {
	return words[rand.Intn(len(words))] + "-" + words[rand.Intn(len(words))]
}
