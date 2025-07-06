// src/commands/barter.js

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
 * /barter
 * After crossing a dungeon floor, there’s a 15% chance a wandering trader appears.
 * This command checks for the trader and, if present, lets the player buy items or skip.
 */
export const data = new SlashCommandBuilder()
  .setName('barter')
  .setDescription('🛒 Encounter the wandering trader');

export async function execute(interaction) {
  // Defer reply to allow time for HTTP request
  await interaction.deferReply({ ephemeral: false });

  try {
    // 1️⃣ Check for a trader encounter
    const res = await httpClient.get('/barterer/encounter', {
      params: { user_id: interaction.user.id }
    });
    const { spawn, items } = res.data;

    // 2️⃣ No trader this time
    if (!spawn) {
      await interaction.editReply('😕 No wandering trader showed up this floor.');
      return;
    }

    // 3️⃣ Build embed listing the trader's wares
    const embed = new EmbedBuilder()
      .setTitle('🔹 A Wandering Trader Appears!')
      .setDescription('He offers the following items for sale:')
      .setColor(0x00A8FF)
      .setTimestamp();

    items.forEach(item => {
      embed.addFields({
        name: `${item.name} — ${item.price.toLocaleString()} 🪙`,
        value: item.description,
        inline: false
      });
    });

    // 4️⃣ Build action rows with Buy buttons and a Skip button
    const rows = [];
    items.forEach(item => {
      const buyButton = new ButtonBuilder()
        .setCustomId(`barter_buy_${item.id}`)
        .setLabel(`Buy ${item.name}`)
        .setStyle(ButtonStyle.Primary);

      const skipButton = new ButtonBuilder()
        .setCustomId('barter_skip')
        .setLabel('Skip Trader')
        .setStyle(ButtonStyle.Secondary);

      rows.push(new ActionRowBuilder().addComponents(buyButton, skipButton));
    });

    // 5️⃣ Send the embed with buttons
    const message = await interaction.editReply({
      embeds: [embed],
      components: rows
    });

    // 6️⃣ Collector to handle button interactions
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60_000, // 60 seconds
      filter: i => i.user.id === interaction.user.id
    });

    collector.on('collect', async i => {
      // Skip the trader
      if (i.customId === 'barter_skip') {
        await i.update({
          content: '🕶️ You decided to skip the trader.',
          embeds: [],
          components: []
        });
        collector.stop();
        return;
      }

      // Buy an item
      if (i.customId.startsWith('barter_buy_')) {
        const itemId = i.customId.replace('barter_buy_', '');

        try {
          // 7️⃣ Attempt purchase via service endpoint
          const buyRes = await httpClient.post('/barterer/buy', {
            user_id: interaction.user.id,
            item_id: itemId
          });
          const { success, error, item } = buyRes.data;

          if (!success) {
            await i.update({
              content: `❌ ${error}`,
              embeds: [],
              components: []
            });
          } else {
            await i.update({
              content: `✅ You purchased **${item.name}** for ${item.price.toLocaleString()} 🪙!`,
              embeds: [],
              components: []
            });
          }
        } catch (err) {
          console.error('Barter purchase error:', err);
          await i.update({
            content: '❌ There was an error processing your purchase.',
            embeds: [],
            components: []
          });
        }

        collector.stop();
      }
    });

    collector.on('end', async collected => {
      if (collected.size === 0) {
        await interaction.editReply({
          content: '⌛ Time’s up – the trader has packed up and left.',
          embeds: [],
          components: []
        });
      }
    });

  } catch (err) {
    console.error('Error during /barter:', err);
    const reply = interaction.deferred ? interaction.editReply : interaction.reply;
    await reply.call(interaction, {
      content: '❌ Unable to contact the trader service. Please try again later.',
      ephemeral: true
    });
  }
}