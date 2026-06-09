# Claude-Discord bot

**Version**: 1.0.3

## How to run

### Prerequisites
- Node.js 18+
- [Claude Code CLI](https://claude.ai/code) installed and authenticated (`claude` command available in PATH)
- A Discord bot token ([Discord Developer Portal](https://discord.com/developers/applications))

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create an instance folder under `instances/` and add a `.env` file:
   ```bash
   mkdir instances/my-bot
   cp instances/workspace-freemode/.env instances/my-bot/.env
   # then edit instances/my-bot/.env
   ```

3. Start the bot:
   ```bash
   # 루트에서 인스턴스 폴더를 인자로 지정
   node index.js instances/my-bot

   # 또는 인스턴스 폴더 안에서 직접 실행
   cd instances/my-bot && node ../../index.js
   ```

---

## Multi-instance setup

Multiple bots (with different Discord tokens and behaviors) can run in parallel from separate instance folders. Each folder has its own `.env` and its own `sessions.json`.

```
claude-discord-bot/
  index.js
  instances/
    fiance-oracle-prefix/    ← prefix-only mode (!claude)
      .env
      sessions.json          (auto-created)
    workspace-freemode/      ← free mode (responds to all messages)
      .env
      sessions.json          (auto-created)
```

Run each instance in a separate terminal (or as a separate systemd service / pm2 process):

```bash
# 루트에서 인자로 실행 (권장)
node index.js instances/finance-oracle-prefix
node index.js instances/workspace-freemode

# 또는 인스턴스 폴더 안에서 실행
cd instances/finance-oracle-prefix && node ../../index.js
```

---

## .env reference

```env
DISCORD_TOKEN=your_discord_bot_token

# Restrict to specific channels (comma-separated IDs). Leave empty for all channels.
ALLOWED_CHANNEL_IDS=id1,id2,id3

# Response mode
PREFIX_ONLY=true          # true  → only respond when message starts with PREFIX
                          # false → respond to every message
PREFIX=!claude            # prefix to use when PREFIX_ONLY=true (default: !claude)

# Working directory for Claude Code
PROJECT_DIR=/path/to/your/project

# Per-channel working directories (overrides PROJECT_DIR for matched channels)
# Format: CHANNEL_ID:PATH pairs separated by commas
CHANNEL_PROJECT_DIRS=id1:/path/to/project-a,id2:/path/to/project-b

# Session TTL in milliseconds (default: 24 hours)
# SESSION_TTL_MS=86400000
```

---

## Behavior by mode

| Message | `PREFIX_ONLY=true` (`PREFIX=!claude`) | `PREFIX_ONLY=false` |
|---------|--------------------------------------|---------------------|
| `!claude 안녕` | responds | responds |
| `안녕` | ignored | responds |
| `!reset` | resets session | resets session |

`!reset` always works regardless of mode.

---

## Functions

- **Message Generation**: Forwards messages to Claude Code CLI and posts the response back to Discord.
- **Session Management**: Per-channel conversation sessions so Claude remembers prior messages.
  - Sessions are persisted in `sessions.json` (inside each instance folder) and survive bot restarts.
  - Sessions expire after 24 hours of inactivity (override with `SESSION_TTL_MS`).
  - Send `!reset` to clear the session and start a fresh conversation.
- **Per-channel project directories**: Each channel can point Claude Code at a different working directory via `CHANNEL_PROJECT_DIRS`.

## Settings

Permissions can be configured using `.claude/settings.json` in your project directory.
