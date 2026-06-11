# Claude-Discord bot

**Version**: 1.0.3

A Discord bot that forwards messages to [Claude Code CLI](https://claude.ai/code) and replies with the response. Supports multiple independent bot instances, per-channel project directories, and persistent sessions.

## Prerequisites

- Node.js 18+
- [Claude Code CLI](https://claude.ai/code) installed and authenticated (`claude` command available in PATH)
- A Discord bot token ([Discord Developer Portal](https://discord.com/developers/applications))

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create an instance folder under `instances/` using the provided example:
   ```bash
   cp -r instances/project-example instances/my-bot
   # then edit instances/my-bot/.env
   ```

3. Start the bot:
   ```bash
   # Specify instance folder as argument (recommended)
   node index.js instances/my-bot

   # Or run from inside the instance folder
   cd instances/my-bot && node ../../index.js
   ```

---

## Instance directory resolution

The bot determines its instance directory in this order:

1. **CLI argument**: `node index.js instances/my-bot`
2. **Current directory** (if different from project root): `cd instances/my-bot && node ../../index.js`
3. **Project root** (fallback): reads `.env` from the project root

Each instance loads its own `.env`, stores sessions in `sessions.json`, and optionally reads `settings.json` for Claude Code settings.

---

## Multi-instance setup

Multiple bots (with different Discord tokens and behaviors) can run in parallel from separate instance folders.

```
claude-discord-bot/
  index.js
  instances/
    project-example/          ← template (tracked in git)
      .env
    my-bot-a/                 ← bot A (gitignored)
      .env
      settings.json           (optional, passed as --settings to Claude Code)
      sessions.json           (auto-created)
    my-bot-b/                 ← bot B (gitignored)
      .env
      sessions.json           (auto-created)
```

Run each instance in a separate terminal (or as a separate systemd service / pm2 process):

```bash
node index.js instances/my-bot-a
node index.js instances/my-bot-b
```

---

## .env reference

See [`instances/project-example/.env`](instances/project-example/.env) for a ready-to-copy template.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DISCORD_TOKEN` | **Yes** | — | Discord bot token |
| `ALLOWED_CHANNEL_IDS` | No | *(all channels)* | Comma-separated channel IDs to respond in |
| `FREE_MODE` | No | `false` | `true` = respond to all messages, `false` = mention only |
| `PROJECT_DIR` | No | `process.cwd()` | Working directory for Claude Code |
| `CHANNEL_PROJECT_DIRS` | No | — | Per-channel working dirs: `ID1:/path/a,ID2:/path/b` |
| `CLAUDE_PATH` | No | `which claude` | Path to the `claude` binary |
| `SESSION_TTL_MS` | No | `86400000` (24h) | Session expiry in milliseconds |

---

## Behavior

| `FREE_MODE` | Trigger |
|-------------|---------|
| *(unset)* | mention only — `@bot-name message` |
| `true` | all messages in allowed channels |

`!reset` resets the session for the current channel.

---

## Features

- **Configurable trigger**: mention-only (default) or respond to all messages (`FREE_MODE=true`).
- **Claude Code integration**: Forwards the message to Claude Code CLI and posts the response. Claude is automatically instructed to be concise and not expose secrets.
- **Session management**: Per-channel conversation sessions so Claude remembers prior messages.
  - Sessions are persisted in `sessions.json` inside each instance folder and survive restarts.
  - Sessions expire after 24 hours of inactivity (configurable via `SESSION_TTL_MS`).
  - Send `!reset` to start a fresh session in the current channel.
- **Per-channel project directories**: Each channel can point Claude Code at a different working directory via `CHANNEL_PROJECT_DIRS`.
- **Long response handling**: Responses longer than 1900 characters are automatically split into multiple reply chunks.

---

## Settings

Claude Code permissions and behavior can be configured in two ways:

1. **Project-level**: `.claude/settings.json` in your project directory (`PROJECT_DIR`).
2. **Instance-level**: `settings.json` in the instance folder — automatically passed as `--settings` to Claude Code when present.

### Permission control

The `allow` list in settings.json is **additive** — it does not restrict Claude Code's default permitted tools (Write, Edit, Bash, etc.). To lock down an instance, explicitly `deny` the tools you want to block.

For example, a read-only instance requires both an `allow` list and a `deny` list:

```json
{
  "permissions": {
    "allow": ["Read"],
    "deny": ["Edit", "Write", "Bash(*)", "Glob", "LS"]
  }
}
```
