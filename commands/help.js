// src/commands/help.js

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

/**
 * /help
 * Lists all available commands with brief descriptions.
 */
export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('❓ Show all available commands and how to use them');

export async function execute(interaction) {
  // Defer in case listing takes a moment
  await interaction.deferReply({ ephemeral: true });

  // Dynamically gather all commands from the client
  const commands = interaction.client.commands;

  // Build an embed with each command’s name and description
  const embed = new EmbedBuilder()
    .setTitle('📖 Command List')
    .setDescription('Here are all the commands you can use:')
    .setColor(0x0099FF)
    .setTimestamp();

  // For each command, add a field with its usage
  commands.forEach(({ data }) => {
    // Only include chat-input (slash) commands
    if (data.name && data.description) {
      embed.addFields({
        name: `/${data.name}`,
        value: data.description,
        inline: false
      });
    }
  });

  // Send the embed as an ephemeral reply
  await interaction.editReply({ embeds: [embed] });
}