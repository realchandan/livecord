# Livecord

Live chat with website visitors via Discord.

Check this demo: [https://youtu.be/H6fnrln3b0c](https://youtu.be/H6fnrln3b0c)

## How to use?

The only way to use it is to self-host it. Below is a guide -

Requirements:

1. A server
2. Docker installed
3. A records pointing to the server

Steps to self-host:

1. Go to Discord developer portal and create an app
2. Enable "Message Content Intent" for your app
3. Add your bot to your server, and make sure you give it "Send Messages" permission
4. (Optional) Create a new channel #support under your server
5. SSH into your server
6. Clone this repository and `cd` into the folder
7. Run `cp .env.example .env` and `cp backend/.env.example backend/.env`
8. Fill in your email address for certificate renewal and hostname where the Livecord API would be accessible in the .env file
9. Copy Discord bot token from Discord developer portal, copy your server ID, copy channel ID where you want threads to be created
10. Fill the values in `backend/.env` file. Check the table below for rest of the environment variables
11. Make ports 80 and 443 open
12. Run `docker compose up -d`
13. Add the below code snippet to your web project:

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/gh/realchandan/livecord@builds/0.0.4/widget.js"
>
  import { register } from "https://cdn.jsdelivr.net/gh/realchandan/livecord@builds/0.0.4/widget.js";
  register();
</script>

<chat-widget
  server_url="<YOUR_LIVECORD_SERVER>"
  turnstile_site_key="<YOUR_TURNSTILE_SITE_KEY>"
></chat-widget>
```

| Variable Name        | Explanation                                                                                                                                                                                                          |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BOT_TOKEN            | Self-explanatory                                                                                                                                                                                                     |
| CHANNEL_ID           | Self-explanatory                                                                                                                                                                                                     |
| CORS_ALLOW_ORIGINS   | Domain names separated by commas that are allowed to connect to your Livecord server. Use `*` to allow all but that's not recommended. Example value -> `https://example.com,https://www.example.com`                |
| GUILD_ID             | Discord server ID                                                                                                                                                                                                    |
| JWT_SECRET           | A string secret to be used for issuing JWTs. Can be any string but should be strong. Example - `t0psecret`                                                                                                           |
| TURNSTILE_SECRET_KEY | Cloudflare Turnstile secret key. It's recommended to use Turnstile to reduce spam. This is the only optional variable - all other variables are required. If you don't provide anything, Turnstile would be disabled |

Backward compatibility is not guaranteed, and the widget and server are expected to work fine as long as they use the same tag.
