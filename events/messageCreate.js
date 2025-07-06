// src/events/messageCreate.js

import { Events } from 'discord.js';
import logger from '../utils/logger.js';
import config from '../config.json';

/**
 * Handles incoming text messages for:
 *  - Logging
 *  - Optional legacy/prefix‐based commands
 */
export const name = Events.MessageCreate;
export const once = false;

export async function execute(message, client) {
  // 1️⃣ Ignore bots
  if (message.author.bot) return;

  // 2️⃣ Log every message for debugging/audit
  const location = message.guild
    ? `[Guild: ${message.guild.name} → #${message.channel.name}]`
    : '[DM]';
  logger.info(`${location} ${message.author.tag}: ${message.content}`);

  // 3️⃣ Prefix‐based fallback (optional)
  const prefix = config.prefix || '!';
  if (!message.content.startsWith(prefix)) return;

  // 4️⃣ Parse command name and args
  const [cmdName, ...args] = message.content
    .slice(prefix.length)
    .trim()
    .split(/\s+/);
  const command = client.commands.get(cmdName.toLowerCase());
  if (!command) {
    // You can remove this reply if you prefer silent fails
    await message.reply(
      `❓ Unknown command \`${cmdName}\`. Use \`/help\` to see all available slash commands.`
    );
    return;
  }

  // 5️⃣ Execute legacy command handler if defined
  if (typeof command.executeText === 'function') {
    try {
      await command.executeText(message, args);
    } catch (err) {
      logger.error(`Error executing text command "${cmdName}":`, err);
      await message.reply('❌ There was an error executing that command.');
    }
  }
}