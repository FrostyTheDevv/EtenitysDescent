// src/index.js
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client, Collection, GatewayIntentBits, Partials, REST, Routes } from 'discord.js';

// ─── Setup __dirname for ES modules ─────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── Load config placeholders from env ─────────────────────────────────────────
import config from '../config.json' assert { type: 'json' };
const CLIENT_ID   = process.env.CLIENT_ID   || config.clientId;
const GUILD_ID    = process.env.GUILD_ID    || config.guildId;
const SERVICE_URL = process.env.SERVICE_URL || config.serviceUrl;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

// ─── Create Discord client ─────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// ─── Prepare command collection ─────────────────────────────────────────────────
client.commands = new Collection();
const commands = [];

// ─── Load command modules ───────────────────────────────────────────────────────
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const filePath = path.join(commandsPath, file);
  const { data, execute } = await import(filePath);
  if (data?.name && execute) {
    client.commands.set(data.name, { data, execute });
    commands.push(data.toJSON());
  } else {
    console.warn(`Skipping ${file}: missing data or execute`);
  }
}

// ─── Register slash commands on startup ────────────────────────────────────────
const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    console.log(`Registering ${commands.length} commands to guild ${GUILD_ID}...`);
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log('✅ Successfully registered commands.');
  } catch (err) {
    console.error('❌ Error registering commands:', err);
  }
})();

// ─── Load event handlers ────────────────────────────────────────────────────────
const eventsPath = path.join(__dirname, 'events');
for (const file of fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'))) {
  const filePath = path.join(eventsPath, file);
  const { name, once, execute } = await import(filePath);
  if (once) {
    client.once(name, (...args) => execute(...args, client, SERVICE_URL));
  } else {
    client.on(name, (...args) => execute(...args, client, SERVICE_URL));
  }
}

// ─── Log in ────────────────────────────────────────────────────────────────────
client.login(DISCORD_TOKEN)
  .then(() => console.log('✅ Bot logged in'))
  .catch(err => {
    console.error('❌ Failed to log in:', err);
    process.exit(1);
  });

// ─── Export for testing or external use ────────────────────────────────────────
export default client;