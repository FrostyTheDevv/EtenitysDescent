// src/commands/forge.js

import {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder
} from 'discord.js';
import httpClient from '../utils/httpClient.js';

/**
 * /forge
 * Opens a crafting modal; on submit, attempts to forge the specified item(s).
 */
export const data = new SlashCommandBuilder()
  .setName('forge')
  .setDescription('🔨 Forge a new item with optional traits');

/**
 * This execute handler responds both to the slash invocation (showing the modal)
 * and to the modal submission (processing the forge request).
 */
export async function execute(interaction) {
  // 1️⃣ Slash command: show the crafting modal
  if (interaction.isChatInputCommand()) {
    const modal = new ModalBuilder()
      .setCustomId('forge_modal')
      .setTitle('Forge an Item');

    // Item ID input
    const itemIdInput = new TextInputBuilder()
      .setCustomId('item_id')
      .setLabel('Item ID to forge')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g., fire_sword')
      .setRequired(true);

    // Traits / Runes input (comma-separated)
    const traitsInput = new TextInputBuilder()
      .setCustomId('traits')
      .setLabel('Traits / Runes (comma-separated)')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('e.g., burn, critBoost')
      .setRequired(false);

    // Quantity input
    const quantityInput = new TextInputBuilder()
      .setCustomId('quantity')
      .setLabel('Quantity')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g., 1')
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(itemIdInput),
      new ActionRowBuilder().addComponents(traitsInput),
      new ActionRowBuilder().addComponents(quantityInput)
    );

    await interaction.showModal(modal);
    return;
  }

  // 2️⃣ Modal submission: process the forge request
  if (interaction.isModalSubmit() && interaction.customId === 'forge_modal') {
    await interaction.deferReply({ ephemeral: true });

    try {
      const userId = interaction.user.id;
      const itemId = interaction.fields.getTextInputValue('item_id');
      const traitsRaw = interaction.fields.getTextInputValue('traits');
      const quantityRaw = interaction.fields.getTextInputValue('quantity');

      // Parse traits and quantity
      const traits = traitsRaw
        ? traitsRaw.split(',').map(t => t.trim()).filter(Boolean)
        : [];
      const quantity = parseInt(quantityRaw, 10);
      if (isNaN(quantity) || quantity < 1) {
        throw new Error('Quantity must be a positive integer.');
      }

      // Call the microservice to forge the item
      const res = await httpClient.post('/item/forgeItem', {
        user_id: userId,
        item_id: itemId,
        traits,
        quantity
      });

      const { success, error, forgedItem, cost } = res.data;
      if (!success) {
        await interaction.editReply({
          content: `❌ Could not forge item: ${error}`
        });
        return;
      }

      // Build embed showing forged item details
      const embed = new EmbedBuilder()
        .setTitle('🔨 Forge Successful')
        .setColor(0x228B22)
        .addFields(
          { name: 'Item', value: `**${forgedItem.name}** (x${quantity})`, inline: false },
          { name: 'Cost', value: `${cost.toLocaleString()} 🪙`, inline: true },
          { name: 'Traits', value: traits.length ? traits.join(', ') : 'None', inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('Error in forge modal submission:', err);
      await interaction.editReply({
        content: `❌ Error forging item: ${err.message || 'Unknown error'}`
      });
    }
  }
}