// src/commands/inventory.js

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
 * /inventory
 * Shows your inventory in pages of 10 items, with Previous/Next buttons.
 */
export const data = new SlashCommandBuilder()
  .setName('inventory')
  .setDescription('📦 View and manage your inventory');

export async function execute(interaction) {
  const userId = interaction.user.id;
  const pageSize = 10;
  let page = 1;

  await interaction.deferReply({ ephemeral: true });

  // Helper to fetch and display a page
  const showPage = async (pageNumber) => {
    try {
      const res = await httpClient.get('/item/getInventory', {
        params: { user_id: userId, page: pageNumber, pageSize }
      });
      const { items, totalItems } = res.data;
      const totalPages = Math.ceil(totalItems / pageSize) || 1;

      // Build embed
      const embed = new EmbedBuilder()
        .setTitle(`${interaction.user.username}’s Inventory`)
        .setColor(0x00AAFF)
        .setTimestamp()
        .setFooter({ text: `Page ${pageNumber} of ${totalPages}` });

      if (items.length === 0) {
        embed.setDescription('_Your inventory is empty._');
      } else {
        // List items
        const lines = items.map(it => {
          const equippedTag = it.isEquipped ? ' (Equipped)' : '';
          return `• **${it.name}** x${it.quantity}${equippedTag}`;
        });
        embed.setDescription(lines.join('\n'));
      }

      // Build buttons
      const row = new ActionRowBuilder();
      if (pageNumber > 1) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId('inv_prev')
            .setLabel('◀️ Previous')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      if (pageNumber < totalPages) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId('inv_next')
            .setLabel('Next ▶️')
            .setStyle(ButtonStyle.Secondary)
        );
      }

      // Send or edit reply
      if (pageNumber === 1) {
        return await interaction.editReply({
          embeds: [embed],
          components: [row]
        });
      } else {
        return await interaction.editReply({
          embeds: [embed],
          components: [row]
        });
      }
    } catch (err) {
      console.error('Error fetching inventory:', err);
      await interaction.editReply({
        content: '❌ Could not load inventory. Please try again later.',
        embeds: [],
        components: []
      });
    }
  };

  // Show first page
  await showPage(page);

  // Collector for button interactions
  const message = await interaction.fetchReply();
  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 120_000, // 2 minutes
    filter: (btn) => btn.user.id === userId
  });

  collector.on('collect', async (btn) => {
    // Update page
    if (btn.customId === 'inv_prev') {
      page = Math.max(1, page - 1);
    } else if (btn.customId === 'inv_next') {
      page = page + 1;
    }

    await btn.deferUpdate();
    await showPage(page);
  });

  collector.on('end', async (collected) => {
    // Disable buttons when collector ends
    const disabledRow = new ActionRowBuilder();
    const originalRow = message.components[0];
    for (const comp of originalRow.components) {
      disabledRow.addComponents(ButtonBuilder.from(comp).setDisabled(true));
    }
    await message.edit({ components: [disabledRow] });
  });
}