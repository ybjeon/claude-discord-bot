const path = require("node:path");

// 인스턴스 디렉토리 결정 순서:
//   1. CLI 인자: node index.js instances/my-bot
//   2. cwd가 루트와 다를 때: cd instances/my-bot && node ../../index.js
//   3. 그 외: 루트 디렉토리 자체 (루트 .env 사용)
const instanceArg = process.argv[2];
const instanceDir = instanceArg
  ? path.resolve(__dirname, instanceArg)
  : process.cwd() !== __dirname
  ? process.cwd()
  : __dirname;

require("dotenv").config({ path: path.join(instanceDir, ".env") });

const { Client, GatewayIntentBits, Events } = require("discord.js");
const { execFile, execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");

const CLAUDE_BIN = (() => {
  if (process.env.CLAUDE_PATH) return process.env.CLAUDE_PATH;
  try {
    return execFileSync("which", ["claude"], { encoding: "utf8" }).trim();
  } catch {
    return "claude";
  }
})();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS) || 24 * 60 * 60 * 1000;

const channelProjectDirs = new Map(
  (process.env.CHANNEL_PROJECT_DIRS || "")
    .split(",")
    .filter(Boolean)
    .map((pair) => {
      const idx = pair.indexOf(":");
      return [pair.slice(0, idx).trim(), pair.slice(idx + 1).trim()];
    })
);

function getProjectDir(channelId) {
  return channelProjectDirs.get(channelId) || process.env.PROJECT_DIR || process.cwd();
}

// sessions.json은 인스턴스 폴더(process.cwd())에 저장
function sessionsFilePath() {
  return path.join(instanceDir, "sessions.json");
}

function loadSessions() {
  try {
    const raw = fs.readFileSync(sessionsFilePath(), "utf8");
    return new Map(Object.entries(JSON.parse(raw)));
  } catch {
    return new Map();
  }
}

function saveSessions(sessions) {
  fs.writeFileSync(sessionsFilePath(), JSON.stringify(Object.fromEntries(sessions)), "utf8");
}

const sessions = loadSessions();

function getOrCreateSession(channelId) {
  const entry = sessions.get(channelId);
  if (entry && Date.now() - entry.lastUsed < SESSION_TTL_MS) {
    return entry;
  }
  const sessionId = randomUUID();
  const newEntry = { sessionId, lastUsed: Date.now(), initialized: false };
  sessions.set(channelId, newEntry);
  saveSessions(sessions);
  return newEntry;
}

function markSessionInitialized(channelId) {
  const entry = sessions.get(channelId);
  if (entry) {
    entry.initialized = true;
    entry.lastUsed = Date.now();
    saveSessions(sessions);
  }
}

function runClaude(prompt, sessionEntry, channelId) {
  return new Promise((resolve, reject) => {
    const cwd = getProjectDir(channelId);
    const sessionFlag = sessionEntry.initialized
      ? ["--resume", sessionEntry.sessionId]
      : ["--session-id", sessionEntry.sessionId];

    execFile(
      CLAUDE_BIN,
      [
        "-p",
        prompt,
        ...sessionFlag,
        "--append-system-prompt",
        "You are being called from a Discord bot. Be concise. Do not expose secrets.",
      ],
      {
        cwd,
        timeout: 120_000,
        maxBuffer: 1024 * 1024 * 5,
      },
      (error, stdout, stderr) => {
        if (error) return reject(stderr || error.message);
        resolve(stdout.trim());
      }
    );
  });
}

client.once(Events.ClientReady, (c) => {
  console.log(`Logged in as ${c.user.tag} [mode: mention]`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const allowedChannels = process.env.ALLOWED_CHANNEL_IDS
    ? process.env.ALLOWED_CHANNEL_IDS.split(",").map((id) => id.trim())
    : [];
  if (allowedChannels.length > 0 && !allowedChannels.includes(message.channel.id)) {
    return;
  }

  const content = message.content.trim();

  // !reset은 모드 무관하게 항상 동작
  if (content === "!reset") {
    sessions.delete(message.channel.id);
    saveSessions(sessions);
    return message.reply("새 대화를 시작합니다.");
  }

  if (!message.mentions.has(client.user)) return;

  const prompt = content.replace(/<@!?\d+>/g, "").trim();
  if (!prompt) return;

  const sessionEntry = getOrCreateSession(message.channel.id);

  await message.channel.sendTyping();

  try {
    const answer = await runClaude(prompt, sessionEntry, message.channel.id);
    markSessionInitialized(message.channel.id);
    const chunks = answer.match(/[\s\S]{1,1900}/g) || ["응답이 비어 있습니다."];

    for (const chunk of chunks) {
      await message.reply("```text\n" + chunk + "\n```");
    }
  } catch (err) {
    await message.reply(`Claude Code 실행 중 오류가 났습니다:\n\`\`\`text\n${String(err).slice(0, 1800)}\n\`\`\``);
  }
});

client.login(process.env.DISCORD_TOKEN);
