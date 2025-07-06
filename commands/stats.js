// src/commands/stats.js

import {
  SlashCommandBuilder,
  EmbedBuilder
} from 'discord.js';
import httpClient from '../utils/httpClient.js';

/**
 * /stats
 * Shows the player's current character statistics, rank, XP, and equipped items.
 *
 * Expects GET /player/stats?user_id=... to return:
 * {
 *   success: boolean,
 *   stats: {
 *     strength: number,
 *     agility: number,
 *     intelligence: number,
 *     vitality: number,
 *     // any other stats
 *   },
 *   rank: string,
 *   xp: number,
 *   nextRankXp: number,
 *   equipment: Array<{
 *     id: string,
 *     name: string,
 *     slot: string,         // e.g. "Weapon", "Armor", "Accessory"
 *     isEquipped: boolean,
 *     iconUrl?: string      // optional tiny icon URL
 *   }>
 * }
 */
export const data = new SlashCommandBuilder()
  .setName('stats')
  .setDescription('📊 View your character stats and equipped items');

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: false });

  try {
    // Fetch player stats & equipment
    const res = await httpClient.get('/player/stats', {
      params: { user_id: interaction.user.id }
    });
    const { success, stats, rank, xp, nextRankXp, equipment } = res.data;

    if (!success) {
      await interaction.editReply({ content: '❌ Could not load your stats. Please try again later.' });
      return;
    }

    // Build the embed
    const embed = new EmbedBuilder()
      .setTitle(`${interaction.user.username}’s Character Profile`)
      .setColor(0x3498DB)
      .addFields(
        { name: 'Rank', value: `**${rank}**`, inline: true },
        { name: 'XP',   value: `${xp.toLocaleString()} / ${nextRankXp.toLocaleString()}`, inline: true },
        // Stats fields
        ...Object.entries(stats).map(([key, value]) => ({
          name: key.charAt(0).toUpperCase() + key.slice(1),
          value: value.toString(),
          inline: true
        }))
      )
      .setTimestamp();

    // Equipment section
    if (equipment && equipment.length) {
      const equipLines = equipment.map(eq => {
        const icon = eq.iconUrl ? `![icon](${eq.iconUrl}) ` : '';
        const status = eq.isEquipped ? ' (Equipped)' : '';
        return `${icon}**${eq.slot}:** ${eq.name}${status}`;
      });
      embed.addFields({
        name: '🗡️ Equipment',
        value: equipLines.join('\n'),
        inline: false
      });
    } else {
      embed.addFields({
        name: '🗡️ Equipment',
        value: '_No items equipped._',
        inline: false
      });
    }

    // Send the embed
    await interaction.editReply({ embeds: [embed] });

  } catch (err) {
    console.error('Error in /stats command:', err);
    await interaction.editReply({
      content: '❌ An error occurred while fetching your profile. Please try again later.'
    });
  }
}