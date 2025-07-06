// src/commands/narrative.js

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
 * /story
 * Advances the campaign narrative by one beat, optionally presenting choices.
 * 
 * Service endpoint POST /story/progressNarrative
 * Expects { user_id: string, choice?: string }
 * Returns {
 *   success: boolean,
 *   narrative: string,
 *   options?: Array<{ id: string, label: string }>
 * }
 */
export const data = new SlashCommandBuilder()
  .setName('story')
  .setDescription('📖 Advance the campaign narrative');

export async function execute(interaction) {
  // Defer to allow time for HTTP requests
  await interaction.deferReply({ ephemeral: false });

  // Internal function to render narrative and choices
  const render = async (narrative, options) => {
    const embed = new EmbedBuilder()
      .setTitle('📖 Campaign Narrative')
      .setDescription(narrative)
      .setColor(0x8A2BE2)
      .setTimestamp();

    let components = [];
    if (options?.length) {
      const row = new ActionRowBuilder();
      for (const opt of options) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`story_choice_${opt.id}`)
            .setLabel(opt.label)
            .setStyle(ButtonStyle.Primary)
        );
      }
      components = [row];
    }

    return { embeds: [embed], components };
  };

  // Fetch initial narrative beat
  try {
    const res = await httpClient.post('/story/progressNarrative', {
      user_id: interaction.user.id
    });
    const { success, narrative, options } = res.data;

    if (!success) {
      await interaction.editReply({
        content: `❌ ${narrative || 'Could not advance the story.'}`
      });
      return;
    }

    // Send narrative and any choice buttons
    const payload = await render(narrative, options);
    const message = await interaction.editReply(payload);

    // If there are choices, set up a collector
    if (options?.length) {
      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 120_000, // 2 minutes
        filter: i => i.user.id === interaction.user.id
      });

      collector.on('collect', async i => {
        const choiceId = i.customId.replace('story_choice_', '');
        await i.deferUpdate();

        // Fetch next narrative based on choice
        try {
          const choiceRes = await httpClient.post('/story/progressNarrative', {
            user_id: interaction.user.id,
            choice: choiceId
          });
          const { narrative: nextNarrative, options: nextOptions } = choiceRes.data;
          const nextPayload = await render(nextNarrative, nextOptions);
          await interaction.editReply(nextPayload);
        } catch (err) {
          console.error('Error processing narrative choice:', err);
          await interaction.editReply({
            content: '❌ An error occurred processing your choice. Please try again later.',
            components: []
          });
        }
        collector.stop();
      });

      collector.on('end', async collected => {
        if (collected.size === 0) {
          // Disable buttons if no choice made
          const disabled = message.components.map(row =>
            ActionRowBuilder.from(row).setComponents(
              row.components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
            )
          );
          await message.edit({ components: disabled });
        }
      });
    }
  } catch (err) {
    console.error('Error in /story command:', err);
    await interaction.editReply({
      content: '❌ Unable to reach the story service. Please try again later.'
    });
  }
}