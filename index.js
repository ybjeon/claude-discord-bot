require("dotenv").config();

const { Client, GatewayIntentBits, Events } = require("discord.js");
const { execFile } = require("node:child_process");
const path = require("node:path");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

function runClaude(prompt) {
  return new Promise((resolve, reject) => {
    const cwd = process.env.PROJECT_DIR || process.cwd();

    execFile(
      "claude",
      [
        "-p",
        prompt,
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
  console.log(`Logged in as ${c.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  if (
    process.env.ALLOWED_CHANNEL_ID &&
    message.channel.id !== process.env.ALLOWED_CHANNEL_ID
  ) {
    return;
  }

  if (!message.content.startsWith("!claude ")) return;

  const prompt = message.content.slice("!claude ".length).trim();
  if (!prompt) return message.reply("질문을 입력해 주세요.");

  await message.channel.sendTyping();

  try {
    const answer = await runClaude(prompt);
    const chunks = answer.match(/[\s\S]{1,1900}/g) || ["응답이 비어 있습니다."];

    for (const chunk of chunks) {
      await message.reply("```text\n" + chunk + "\n```");
    }
  } catch (err) {
    await message.reply(`Claude Code 실행 중 오류가 났습니다:\n\`\`\`text\n${String(err).slice(0, 1800)}\n\`\`\``);
  }
});

client.login(process.env.DISCORD_TOKEN);