import { Turnstile } from "@marsidev/react-turnstile";

import type { TurnstileInstance } from "@marsidev/react-turnstile";
import {
  type MotionProps,
  AnimatePresence as OriginalAnimatePresence,
  motion,
} from "framer-motion";
import register from "preact-custom-element";
import { useEffect, useRef, useState } from "preact/hooks";
import { io } from "socket.io-client";
import {
  Sender,
  isConnected,
  messageSchema,
  messages,
  onNewMessageSound,
  sendMessage,
  socket,
} from "./common";
import { Header } from "./components/header";
import { Keypad } from "./components/keypad";
import { Messages } from "./components/messages";
import { ChatLogo } from "./components/svgs";
import "./style.css";

const AnimatePresence =
  OriginalAnimatePresence as unknown as preact.FunctionComponent<{
    children: preact.ComponentChildren;
  }>;

type PreactMotionProps = Omit<MotionProps, "children"> & {
  children?: preact.ComponentChildren;
  className?: string;
  onClick?: (event: MouseEvent) => void;
  onKeyPress?: (event: KeyboardEvent) => void;
};

const MotionDiv = motion.div as preact.FunctionComponent<PreactMotionProps>;

interface AppProps {
  server_url: string;
  turnstile_site_key: string | null | undefined;
}

let isFetching = false;

export const ChatBot = ({ server_url, turnstile_site_key }: AppProps) => {
  const [inputValue, setInputValue] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const [soundActive, setSoundActive] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setTimeout(() => {
      messages.value = [
        ...messages.value,
        messageSchema.parse({
          content: "Hello 👋",
          message_id: "0",
          sender: Sender.Owner,
          sent_at: 0,
          buttons: [],
          dots: 1000,
        }),
      ];
    }, 1000);
  }, []);

  const handleNewMessage = (t: any) =>
    messageSchema
      .parseAsync(t)
      .then((message) => {
        if (soundActive) {
          if (audioRef.current) {
            audioRef.current.play();
          }
        }

        let messagesCopy = [...messages.value];

        for (const message of messagesCopy) {
          message.buttons = [];
        }

        messagesCopy = messagesCopy.filter((m) => m.message_id !== "");

        if (message.sender === Sender.Visitor) {
          messagesCopy = [
            ...messagesCopy,
            message,
            messageSchema.parse({
              content: "",
              message_id: "",
              sender: Sender.Owner,
              sent_at: Date.now() / 1000,
              dots: 60000,
            }),
          ];
        } else {
          messagesCopy = [...messagesCopy, message];
        }

        messages.value = messagesCopy;
      })
      .catch((_) => {});

  const baseUrl = () => {
    return new URL(server_url).origin;
  };

  const openChatWidget = () => {
    setIsOpen(true);

    if (isFetching === true) return;

    if (isConnected.value === true) return;

    isFetching = true;

    fetch(`${baseUrl()}/startChat?turnstileToken=${turnstileToken}`)
      .then(async (response) => {
        isFetching = false;

        if (!response.ok) {
          throw new Error("Cannot start chat");
        }
        const token = await response.text();
        socket.value = io(baseUrl(), {
          query: { jwt: token },
        });

        socket.value.on("message", handleNewMessage);

        socket.value.on("connect", () => {
          isConnected.value = true;
        });

        socket.value.on("disconnect", () => {
          isConnected.value = false;
        });
      })
      .catch(() => {
        isFetching = false;
      });
  };

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<(HTMLDivElement & TurnstileInstance) | null>(
    null,
  );

  return (
    <div>
      {turnstile_site_key && (
        <Turnstile
          ref={turnstileRef}
          siteKey={turnstile_site_key}
          onSuccess={(newToken) => setTurnstileToken(newToken)}
          onExpire={() => turnstileRef.current?.reset()}
        />
      )}

      <div class="fixed right-0 bottom-0 flex flex-col-reverse items-end sm:mr-4 sm:mb-4">
        <AnimatePresence>
          {!isOpen && (
            <MotionDiv
              animate={{ y: 0 }}
              initial={{ y: 100 }}
              exit={{ y: 100 }}
              transition={{ type: "spring", stiffness: 60 }}
              className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-[#006dfe] p-2 pt-3 transition-colors hover:bg-blue-800 max-sm:m-3"
              onClick={() => openChatWidget()}
              onKeyPress={() => openChatWidget()}
            >
              {ChatLogo}
            </MotionDiv>
          )}
        </AnimatePresence>
      </div>

      <div class="fixed right-0 bottom-0 flex flex-col-reverse items-end sm:mr-4 sm:mb-4">
        <audio ref={audioRef}>
          <source src={onNewMessageSound} type="audio/mpeg" />
        </audio>

        <AnimatePresence>
          {isOpen && (
            <MotionDiv
              initial={{ y: 360, scale: 0, x: 200 }}
              animate={{ y: 0, scale: 1, x: 0 }}
              exit={{ y: 360, scale: 0, x: 200 }}
              transition={{ duration: 0.3 }}
              key="widget"
            >
              <div class="relative z-50 flex h-screen w-screen flex-col overflow-hidden bg-white ring-1 shadow-2xl ring-black/5 sm:h-[682px] sm:w-full sm:max-w-[360px] sm:rounded-[1.8rem]">
                <Header
                  setChatBotOpen={setIsOpen}
                  soundOn={soundActive}
                  setSoundOn={setSoundActive}
                />
                <div class="w-full flex-grow overflow-y-auto bg-[#eaeef3]">
                  <Messages messages={messages} addMessage={sendMessage} />
                </div>

                <Keypad
                  inputValue={inputValue}
                  setInputValue={setInputValue}
                  addMessage={sendMessage}
                />

                <div class="flex justify-center gap-1 bg-[#eaeef3] py-2 text-center text-xs text-[12px] text-gray-500">
                  Powered by
                  <div class="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-[#006dfe] p-0.5 transition-colors duration-200 hover:bg-blue-800">
                    {ChatLogo}
                  </div>
                  <span class="text-[#006dfe]">
                    <a
                      href="https://github.com/realchandan/livecord"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Livecord
                    </a>
                  </span>
                </div>
              </div>
            </MotionDiv>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

register(ChatBot, "chat-widget", ["server_url", "turnstile_token"]);
