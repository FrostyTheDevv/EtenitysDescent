// src/events/ready.js

import { Events, ActivityType } from 'discord.js';
import logger from '../utils/logger.js';

/**
 * Fired once when the client becomes ready.
 * Logs a confirmation message and sets the bot’s presence/status.
 */
export const name = Events.ClientReady;
export const once = true;

export async function execute(client) {
  // Log to console or file that the bot has started
  logger.info(`✅ Logged in as ${client.user.tag} (ID: ${client.user.id})`);

  // Optionally, set a presence—here, showing “Playing Eternity’s Descent”
  try {
    await client.user.setActivity('Eternity’s Descent', {
      type: ActivityType.Playing
    });
    logger.info('🔄 Presence set: Playing Eternity’s Descent');
  } catch (err) {
    logger.error('❌ Failed to set presence:', err);
  }
}