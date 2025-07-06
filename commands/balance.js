// src/commands/balance.js

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import httpClient from '../utils/httpClient.js';

/**
 * /balance
 * Fetches and displays the player's current gold balance and letter rank.
 */
export const data = new SlashCommandBuilder()
  .setName('balance')
  .setDescription('💰 View your current gold and rank');

export async function execute(interaction) {
  // Defer reply in case the HTTP request takes a moment
  await interaction.deferReply({ ephemeral: false });

  try {
    // Call the economy/balance endpoint on your microservice
    // Assumes httpClient is preconfigured with baseURL = process.env.SERVICE_URL
    const response = await httpClient.get('/economy/balance', {
      params: { user_id: interaction.user.id }
    });

    // Expected response shape: { gold: number, rank: string, xp: number, nextRankXp: number }
    const { gold, rank, xp, nextRankXp } = response.data;

    // Build an embed to present the data
    const embed = new EmbedBuilder()
      .setTitle(`${interaction.user.username}’s Balance`)
      .setColor(0xFFD700)  // Gold color
      .addFields(
        { name: 'Gold', value: `${gold.toLocaleString()} 🪙`, inline: true },
        { name: 'Rank', value: `**${rank}**`, inline: true },
        // Optionally show progress toward next rank if provided
        ...(typeof nextRankXp === 'number'
          ? [{
              name: 'Progress to Next Rank',
              value: `${xp.toLocaleString()} / ${nextRankXp.toLocaleString()} XP`,
              inline: false
            }]
          : [])
      )
      .setTimestamp();

    // Reply with the embed
    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Error fetching balance:', error);
    // Inform the user of failure
    await interaction.editReply({
      content: '❌ Sorry, I couldn’t fetch your balance right now. Please try again later.',
      ephemeral: true
    });
  }
}