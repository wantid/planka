# Telegram Integration for Planka

This guide covers the setup, configuration, and features of the Telegram integration for Planka.

---

## 🚀 Features

- **Account Linking & Login**: Link your Planka user account to Telegram via deep link (`/start link_<token>`). Log in to Planka in one click with Telegram confirmation (`/start login_<token>`).
- **Avatar Synchronization**: Profile photos from Telegram are automatically imported as the user's Planka avatar upon linking and login. When a user updates their profile picture in Telegram, it syncs one-way to Planka automatically on bot interaction.
- **In-App Notification Forwarding**: All Planka web notifications (card assignments, comments, mentions, and list movements) are immediately forwarded to the user's Telegram chat with the exact same localized text, direct card links, and inline buttons.
- **Due Date Alerts**: Automated notifications in Telegram for cards you are assigned to:
  - 1 week before due date (168h)
  - 3 days before due date (72h)
  - 1 day before due date (24h)
  - On the due date (same calendar day)
- **Daily Digest**: Morning summary of active tasks with due dates, with per-user customizable delivery time and timezone configured in the Mini App / Web settings, plus inline buttons to launch the Mini App or open the web dashboard.
- **Telegram Mini App (`/tg-app`)**:
  - **"My Tasks" Dashboard**: Responsive list of user tasks with horizontal scroll project filter tabs (`[All] [Project 1] ... [Project N]`).
  - **Fast Task Creation**: Modal form to quickly create a card by selecting Project → Board → List, task name, description, due date, and member chips.
  - **Notification Settings**: Control alerts directly in the Mini App (turn On/Off, or mute for 1 or 2 weeks).
- **Dual Mode (Webhook & Polling)**: Automatic fallback to Telegram Long Polling when HTTPS is not available (ideal for local development).

---

## ⚙️ Configuration & Environment Variables

Add the following environment variables to your server `.env` file or `docker-compose.yml`:

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `TELEGRAM_BOT_TOKEN` | string | *none* | Telegram Bot API token from [@BotFather](https://t.me/BotFather). If omitted, Telegram features remain disabled. |
| `TELEGRAM_BOT_USERNAME` | string | *auto-detected* | Telegram bot username (without `@`, e.g., `my_planka_bot`). |
| `TELEGRAM_BOT_MODE` | string | `auto` | Operation mode: `auto`, `webhook`, or `polling`.<br>• `auto`: Uses webhook if `TELEGRAM_WEBHOOK_URL` is set or `BASE_URL` starts with `https://`, otherwise falls back to polling.<br>• `webhook`: Registers webhook at `${TELEGRAM_WEBHOOK_URL}` or `${BASE_URL}/api/telegram/webhook`.<br>• `polling`: Uses long-polling (no public domain or HTTPS needed). |
| `TELEGRAM_WEBHOOK_URL` | string | *optional* | Custom public HTTPS webhook URL if different from `${BASE_URL}/api/telegram/webhook` (e.g. behind reverse proxies). |
| `BASE_URL` | string | `http://localhost:3000` | The public URL of your Planka instance (e.g., `https://planka.example.com`). |

### Example `.env`:

```env
BASE_URL="https://planka.example.com"
TELEGRAM_BOT_TOKEN="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
TELEGRAM_BOT_USERNAME="my_planka_bot"
TELEGRAM_BOT_MODE="auto"
```

---

## 🗄️ Database Migration

Run database migrations to create the required columns and tables (`telegram_link_token`, `telegram_login_token`, `telegram_task_notification`):

```bash
npm run db:migrate --prefix server
```

*(If running with Docker, migrations run automatically on container startup).*

---

## 🤖 BotFather Setup (Mini App & Menu Button)

1. Open [@BotFather](https://t.me/BotFather) in Telegram.
2. Create a new bot with `/newbot` and save the token into `TELEGRAM_BOT_TOKEN`.
3. *(Optional but Recommended)* Set up the **Menu Button** to launch the Mini App:
   - Send `/mybots` → select your bot.
   - Go to **Bot Settings** → **Menu Button** → **Configure menu button**.
   - Send the Mini App URL:
     ```text
     https://<YOUR_PLANKA_DOMAIN>/tg-app
     ```
   - Send the button title, e.g.: `Мои задачи` or `My Tasks`.
4. Set bot commands for quick access:
   - Send `/setcommands` and input:
     ```text
     tasks - Open My Tasks Mini App
     menu - Bot menu and options
     unlink - Unlink Telegram account from Planka
     ```

---

## 📱 User Usage & Workflows

### 1. Linking Account
- **After Login**: When a user logs in, if their Telegram is not linked, a prompt modal will appear asking them to connect Telegram.
- **In Settings**: Go to **User Profile → Notifications → Telegram** and click **Connect Telegram**.
- The bot dialog will open; clicking **Start** links the account instantly.

### 2. Login with Telegram
- On the Planka login page, click **"Войти через Telegram"** (Log in with Telegram).
- Click the button to open Telegram and press **Start**.
- You will be automatically authenticated in your browser without entering a password.

### 3. Telegram Mini App
- Tap the bot's Menu button or run `/tasks` to open the Mini App.
- **Tabs**: Switch between projects using the top horizontal tabs.
- **Create Task**: Tap `+ Задача` to open the fast creation form.
- **Settings**: Tap the gear icon `⚙️` in the top right to configure or mute notifications.
