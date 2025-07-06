// src/events/interactionCreate.js

import { Events } from 'discord.js';
import logger from '../utils/logger.js';

export const name = Events.InteractionCreate;
export const once = false;

/**
 * Handles all incoming interactions:
 *  - Slash commands
 *  - Button presses, select menus, modals, etc.
 */
export async function execute(interaction, client) {
  try {
    // 1️⃣ Slash command handling
    if (interaction.isChatInputCommand()) {
      const cmd = client.commands.get(interaction.commandName);
      if (!cmd) {
        logger.warn(`No command handler for ${interaction.commandName}`);
        return;
      }
      await cmd.execute(interaction);
      return;
    }

    // 2️⃣ Modal submissions and component interactions
    //    Delegate to the command that spawned them by customId prefix
    if (
      interaction.isButton() ||
      interaction.isStringSelectMenu() ||
      interaction.isModalSubmit()
    ) {
      // Determine which command should handle this interaction
      // We assume each customId starts with "<commandName>_" or matches a commandName
      const [commandName] = interaction.customId.split('_');
      const cmd = client.commands.get(commandName);
      if (!cmd) {
        // No matching command; ignore or log
        logger.warn(`No command found for component ${interaction.customId}`);
        return;
      }
      // Many commands define execute to handle both slash and component
      await cmd.execute(interaction);
      return;
    }
  } catch (err) {
    logger.error('Error handling interaction:', err);
    // If interaction already replied or deferred, edit or follow up; else reply
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({
          content: '❌ An unexpected error occurred. Please try again later.',
          embeds: [],
          components: []
        });
      } else {
        await interaction.reply({
          content: '❌ An unexpected error occurred. Please try again later.',
          ephemeral: true
        });
      }
    } catch (replyErr) {
      logger.error('Failed to send error reply:', replyErr);
    }
  }
}