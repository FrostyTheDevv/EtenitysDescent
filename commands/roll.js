// src/commands/roll.js

import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} from 'discord.js';
import httpClient from '../utils/httpClient.js';

/**
 * /roll-power
 * Spend gold to roll for a new power or item from the gacha pool.
 */
export const data = new SlashCommandBuilder()
  .setName('roll-power')
  .setDescription('🎲 Roll for a new power (cost: 100 🪙)');

export async function execute(interaction) {
  // Cost per roll; could also be fetched from a config service
  const COST = 100;
  const userId = interaction.user.id;

  // Show confirmation buttons
  const confirmEmbed = new EmbedBuilder()
    .setTitle('🎲 Gacha Roll')
    .setDescription(`This roll costs **${COST} 🪙**. Do you want to proceed?`)
    .setColor(0xFFA500)
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('roll_confirm')
      .setLabel('Confirm Roll')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('roll_cancel')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.reply({ embeds: [confirmEmbed], components: [row], ephemeral: true });

  const message = await interaction.fetchReply();

  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 30_000, // 30 seconds to choose
    filter: btn => btn.user.id === userId
  });

  collector.on('collect', async btn => {
    await btn.deferUpdate();

    if (btn.customId === 'roll_cancel') {
      // User cancelled
      await interaction.editReply({
        content: '❌ Roll canceled.',
        embeds: [],
        components: []
      });
      collector.stop();
      return;
    }

    // User confirmed: perform the gacha roll
    try {
      const res = await httpClient.post('/gacha/rollPower', {
        user_id: userId,
        cost: COST
      });
      const { success, error, reward, balance } = res.data;
      if (!success) {
        // e.g., insufficient gold
        await interaction.editReply({
          content: `❌ ${error}`,
          embeds: [],
          components: []
        });
      } else {
        // Display the rewarded power/item
        const resultEmbed = new EmbedBuilder()
          .setTitle('🎉 Roll Result')
          .setColor(0x00FF00)
          .addFields(
            { name: 'You received', value: `**${reward.name}**`, inline: false },
            { name: 'Rarity', value: reward.rarity, inline: true },
            { name: 'Your New Balance', value: `${balance} 🪙`, inline: true }
          )
          .setTimestamp();

        // If the service provides an image URL for the reward
        if (reward.imageUrl) {
          resultEmbed.setImage(reward.imageUrl);
        }

        await interaction.editReply({
          content: null,
          embeds: [resultEmbed],
          components: []
        });
      }
    } catch (err) {
      console.error('Error performing gacha roll:', err);
      await interaction.editReply({
        content: '❌ An error occurred while rolling. Please try again later.',
        embeds: [],
        components: []
      });
    }

    collector.stop();
  });

  collector.on('end', async collected => {
    if (collected.size === 0) {
      // No response: disable buttons
      const disabledRow = ActionRowBuilder.from(row).setComponents(
        row.components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
      );
      await interaction.editReply({
        content: '⌛ Time expired — roll canceled.',
        embeds: [],
        components: [disabledRow]
      });
    }
  });
}