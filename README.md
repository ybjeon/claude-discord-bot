# Claude-Discord bot

**Version**: 1.0.1

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

2. Create a `.env` file in the project root:
   ```env
   DISCORD_TOKEN=your_discord_bot_token
   ALLOWED_CHANNEL_IDS=id1,id2,id3      # optional: restrict to specific channels (comma-separated)
   PROJECT_DIR=/path/to/your/project    # optional: default working directory for Claude Code

   # optional: per-channel working directories (overrides PROJECT_DIR for matched channels)
   # format: CHANNEL_ID:PATH pairs separated by commas
   CHANNEL_PROJECT_DIRS=id1:/path/to/project-a,id2:/path/to/project-b
   ```

3. Start the bot:
   ```bash
   node index.js
   ```

### Usage
- Any message sent in the configured channel is forwarded to Claude Code and the response is posted back.
- If `ALLOWED_CHANNEL_IDS` is set, the bot only responds in those channels (comma-separated list of channel IDs).
- Each channel can have its own working directory via `CHANNEL_PROJECT_DIRS`. If not set for a channel, falls back to `PROJECT_DIR`.

## Description
- A **Discord bot** that integrates with the **Claude AI API** to provide various functionalities such as 
  - generating responses
  - summarizing conversations

## Functions
- **Message Generation**: The bot can generate responses to user messages using the Claude AI API.
- **Session Management**: The bot maintains per-channel conversation sessions so Claude remembers prior messages.
  - Sessions are persisted in `sessions.json` and survive bot restarts.
  - Sessions expire after 24 hours of inactivity (override with `SESSION_TTL_MS` env var).
  - Send `!reset` to clear the session and start a fresh conversation.

## Upgrades todos
- Test advanced actions (including write and execute)
- Convert all sending messages to commands (!claude removal as well) - since I'm using the chat room alone
- Session creation and scheduling: Set creation period to approximately one day like some clawlike agents
- Check if Claude Code has a channel concept and apply it #todo

## Problems
- little bit of delay
- Since I cannot see full context of working, I'm still uncomfortable with Write-related operations yet.