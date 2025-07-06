// src/events/error.js

import { EmbedBuilder, ChannelType } from 'discord.js';
import logger from '../utils/logger.js';

/**
 * Global error handler for the Discord client.
 * Catches uncaught errors emitted by the client and logs them.
 * Optionally posts them to a designated Discord channel if ERROR_LOG_CHANNEL_ID is set.
 */
export const name = 'error';
export const once = false;

export async function execute(error, client) {
  // Log the error to console / file
  logger.error('Discord client error:', error);

  // If you have configured an error-logging channel, send the error details there
  const logChannelId = process.env.ERROR_LOG_CHANNEL_ID;
  if (logChannelId) {
    try {
      const channel = await client.channels.fetch(logChannelId);
      if (channel && channel.type === ChannelType.GuildText) {
        const embed = new EmbedBuilder()
          .setTitle('⚠️ Discord Client Error')
          .setDescription(`\`\`\`${error.stack || error.message}\`\`\``)
          .setColor(0xFF0000)
          .setTimestamp();
        await channel.send({ embeds: [embed] });
      }
    } catch (sendErr) {
      logger.error('Failed to send error message to log channel:', sendErr);
    }
  }
}