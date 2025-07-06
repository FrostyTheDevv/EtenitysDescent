// src/commands/shop.js

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
 * /shop
 * Subcommands:
 *   • list ➞ show all shop items with tiny icons
 *   • buy  ➞ purchase an item by its ID
 */
export const data = new SlashCommandBuilder()
  .setName('shop')
  .setDescription('🛒 Browse and buy items')
  .addSubcommand(sub =>
    sub
      .setName('list')
      .setDescription('List all available items in the shop')
  )
  .addSubcommand(sub =>
    sub
      .setName('buy')
      .setDescription('Buy an item from the shop')
      .addStringOption(opt =>
        opt
          .setName('item_id')
          .setDescription('The ID of the item to purchase')
          .setRequired(true)
      )
  );

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: false });

  const userId = interaction.user.id;
  const sub = interaction.options.getSubcommand();

  if (sub === 'list') {
    // Fetch shop items
    try {
      const res = await httpClient.get('/economy/shop/items');
      // Expected: [{ id, name, description, price, iconUrl }]
      const items = res.data;

      if (!Array.isArray(items) || items.length === 0) {
        await interaction.editReply('🛒 The shop is currently empty.');
        return;
      }

      // Build embed
      const embed = new EmbedBuilder()
        .setTitle('🛒 Item Shop')
        .setDescription('Browse items available for purchase:')
        .setColor(0x00AA88)
        .setTimestamp();

      items.forEach(item => {
        // Use markdown image syntax for tiny icon next to name
        const icon = item.iconUrl ? `![icon](${item.iconUrl}) ` : '';
        embed.addFields({
          name: `${icon}**${item.name}** (\`${item.id}\`)`,
          value: `${item.description}\n**Price:** ${item.price.toLocaleString()} 🪙`,
          inline: false
        });
      });

      // Send embed
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('Error fetching shop items:', err);
      await interaction.editReply('❌ Could not load shop items. Please try again later.');
    }

  } else if (sub === 'buy') {
    const itemId = interaction.options.getString('item_id');

    try {
      // Attempt to buy the item
      const res = await httpClient.post('/economy/shop/buy', {
        user_id: userId,
        item_id: itemId
      });

      const { success, error, item, balance } = res.data;
      if (!success) {
        await interaction.editReply(`❌ ${error}`);
        return;
      }

      // Build confirmation embed
      const embed = new EmbedBuilder()
        .setTitle('✅ Purchase Successful')
        .setDescription(`You purchased **${item.name}** (x${item.quantity || 1})`)
        .setColor(0x00CC66)
        .addFields(
          { name: 'Item ID', value: `\`${item.id}\``, inline: true },
          { name: 'Cost',    value: `${item.price.toLocaleString()} 🪙`, inline: true },
          { name: 'Balance', value: `${balance.toLocaleString()} 🪙`, inline: true }
        )
        .setTimestamp();

      // Show icon if available
      if (item.iconUrl) {
        embed.setThumbnail(item.iconUrl);
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('Error purchasing item:', err);
      await interaction.editReply('❌ Purchase failed. Please try again later.');
    }
  }
}