// src/commands/explore.js

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
 * /explore
 * Descend to the next dungeon floor, generating a unique layout and events.
 * 15% chance to encounter a wandering trader is indicated by spawnBarterer.
 *
 * Service endpoint POST /dungeon/generate should return:
 * {
 *   success: boolean,
 *   floor: number,
 *   description: string,
 *   mapImageUrl?: string,      // optional URL to a map image
 *   spawnBarterer: boolean
 * }
 */
export const data = new SlashCommandBuilder()
  .setName('explore')
  .setDescription('🏰 Descend to the next dungeon floor');

export async function execute(interaction) {
  // Defer reply to allow time for generation
  await interaction.deferReply({ ephemeral: false });

  try {
    // 1️⃣ Generate the next dungeon floor for this user
    const res = await httpClient.post('/dungeon/generate', {
      user_id: interaction.user.id
    });
    const { success, floor, description, mapImageUrl, spawnBarterer } = res.data;

    // 2️⃣ Handle failure (e.g., no active session)
    if (!success) {
      await interaction.editReply({
        content: `❌ ${description || 'Unable to generate dungeon.'}`,
        ephemeral: true
      });
      return;
    }

    // 3️⃣ Build the dungeon-floor embed
    const embed = new EmbedBuilder()
      .setTitle(`🗺️ Dungeon Floor ${floor}`)
      .setDescription(description)
      .setColor(0x1F8B4C)
      .setTimestamp();

    // If the service provided a map image, attach it
    if (mapImageUrl) {
      embed.setImage(mapImageUrl);
    }

    // 4️⃣ Prepare action buttons: Descend further always, Barter if merchant spawns
    const row = new ActionRowBuilder();
    const descendBtn = new ButtonBuilder()
      .setCustomId('explore_next')
      .setLabel('⬇️ Descend Further')
      .setStyle(ButtonStyle.Primary);
    row.addComponents(descendBtn);

    if (spawnBarterer) {
      const barterBtn = new ButtonBuilder()
        .setCustomId('explore_barter')
        .setLabel('🛒 Barter with Trader')
        .setStyle(ButtonStyle.Success);
      row.addComponents(barterBtn);
    }

    // 5️⃣ Send the embed with buttons
    const message = await interaction.editReply({
      embeds: [embed],
      components: [row]
    });

    // 6️⃣ Collector to handle button interactions
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60_000, // 60 seconds
      filter: i => i.user.id === interaction.user.id
    });

    collector.on('collect', async i => {
      if (i.customId === 'explore_next') {
        // Descend further: recursively call this command
        await i.deferUpdate();
        collector.stop();
        await execute(interaction);
      } else if (i.customId === 'explore_barter') {
        // Barter with the wandering trader: invoke the /barter command directly
        await i.deferUpdate();
        collector.stop();
        const barterCommand = interaction.client.commands.get('barter');
        if (barterCommand) {
          await barterCommand.execute(interaction);
        } else {
          await interaction.followUp({
            content: '⚠️ Trade command not found. Please run `/barter`.',
            ephemeral: true
          });
        }
      }
    });

    collector.on('end', async collected => {
      if (collected.size === 0) {
        // Disable buttons if time expired
        const disabledRow = ActionRowBuilder.from(row).setComponents(
          row.components.map(btn => btn.setDisabled(true))
        );
        await message.edit({ components: [disabledRow] });
        await interaction.followUp({
          content: '⌛ The echoes in the dungeon grow silent…',
          ephemeral: true
        });
      }
    });

  } catch (err) {
    console.error('Error in /explore command:', err);
    await interaction.editReply({
      content: '❌ An error occurred while exploring. Please try again later.',
      ephemeral: true
    });
  }
}