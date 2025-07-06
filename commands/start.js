// src/commands/start.js

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import httpClient from '../utils/httpClient.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * /start
 * Begins a new game session for the user.
 * Calls POST /sessions/create and returns initial session state.
 */
export const data = new SlashCommandBuilder()
  .setName('start')
  .setDescription('🚀 Start a new dungeon-crawling adventure');

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: false });
  
  try {
    // Generate a unique correlation ID for logging/tracing (optional)
    const correlationId = uuidv4();

    // Call the microservice to create a new session
    const response = await httpClient.post('/sessions/create', {
      user_id: interaction.user.id,
      correlation_id: correlationId
    });

    // Expected response: { session_id, dungeon_level, xp, gold }
    const { session_id, dungeon_level, xp, gold } = response.data;

    // Build an embed to confirm session creation
    const embed = new EmbedBuilder()
      .setTitle('🎉 Adventure Started!')
      .setDescription(`Your journey begins now—good luck!`)
      .setColor(0x00FFAA)
      .addFields(
        { name: 'Session ID', value: `\`${session_id}\``, inline: false },
        { name: 'Dungeon Level', value: `${dungeon_level}`, inline: true },
        { name: 'XP',            value: `${xp}`,           inline: true },
        { name: 'Gold',          value: `${gold} 🪙`,       inline: true }
      )
      .setTimestamp();

    // Send the embed
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in /start command:', error);
    await interaction.editReply({
      content: '❌ Failed to start a new adventure. Please try again later.',
      ephemeral: true
    });
  }
}