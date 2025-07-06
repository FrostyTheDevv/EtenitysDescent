// src/commands/preview.js

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import httpClient from '../utils/httpClient.js';

/**
 * /preview
 * Preview a 3D model (character, monster, or item) by its ID.
 *
 * - Expects a model_id string option corresponding to an asset in your models folder.
 * - Calls the microservice endpoint GET /model/preview?user_id=...&model_id=...
 *   which returns { success: boolean, url: string, name: string, error?: string }.
 */
export const data = new SlashCommandBuilder()
  .setName('preview')
  .setDescription('🔍 Preview a 3D model by its ID')
  .addStringOption(option =>
    option
      .setName('model_id')
      .setDescription('The ID of the model to preview (e.g., goblin_v01)')
      .setRequired(true)
  );

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: false });

  const userId = interaction.user.id;
  const modelId = interaction.options.getString('model_id');

  try {
    // Call the service to get a preview URL
    const res = await httpClient.get('/model/preview', {
      params: { user_id: userId, model_id: modelId }
    });
    const { success, url, name, error } = res.data;

    if (!success) {
      // Service returned an error
      await interaction.editReply({
        content: `❌ Could not generate preview: ${error || 'Unknown error.'}`
      });
      return;
    }

    // Build an embed with the model preview image
    const embed = new EmbedBuilder()
      .setTitle(`🔍 Preview: ${name}`)
      .setDescription(`Here is the 3D preview for **${name}** (ID: \`${modelId}\`)`)
      .setImage(url)
      .setColor(0x7289DA)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('Error in /preview command:', err);
    await interaction.editReply({
      content: '❌ Failed to fetch model preview. Please try again later.'
    });
  }
}