// src/commands/combat.js

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
 * /combat
 * Resolves the next round of combat for your current session.
 *
 * - If you’re not already in combat, this will start a new encounter.
 * - Otherwise, it processes one round (you vs. enemy) and returns the updated state.
 * 
 * The service endpoint POST /combat/resolve should return JSON with:
 * {
 *   success: boolean,
 *   message: string,             // narrative of what happened this round
 *   playerHp: number,
 *   playerMaxHp: number,
 *   enemyHp: number,
 *   enemyMaxHp: number,
 *   loot?: [{ id, name, qty }], // if you defeated the enemy
 *   combatEnd: boolean           // true if encounter is over
 * }
 */
export const data = new SlashCommandBuilder()
  .setName('combat')
  .setDescription('⚔️ Resolve your next combat round (or start a new battle)');

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: false });

  try {
    // Call the microservice to resolve one round of combat
    const response = await httpClient.post('/combat/resolve', {
      user_id: interaction.user.id
    });
    const {
      success,
      message,
      playerHp,
      playerMaxHp,
      enemyHp,
      enemyMaxHp,
      loot,
      combatEnd
    } = response.data;

    if (!success) {
      // Service returned failure (e.g., no active session)
      await interaction.editReply({
        content: `❌ ${message}`,
        ephemeral: true
      });
      return;
    }

    // Build the combat result embed
    const embed = new EmbedBuilder()
      .setTitle('⚔️ Combat Round')
      .setDescription(message)
      .setColor(0xE74C3C)
      .addFields(
        {
          name: '🛡️ You',
          value: `${playerHp} / ${playerMaxHp} HP`,
          inline: true
        },
        {
          name: '👹 Enemy',
          value: `${enemyHp} / ${enemyMaxHp} HP`,
          inline: true
        }
      )
      .setTimestamp();

    // If loot was dropped (i.e., you won)
    if (combatEnd && Array.isArray(loot) && loot.length > 0) {
      const lootDesc = loot
        .map(item => `• **${item.name}** x${item.qty}`)
        .join('\n');
      embed.addFields({
        name: '🎁 Loot Acquired',
        value: lootDesc,
        inline: false
      });
    }

    // If combat is over, offer a button to start the next battle
    const components = [];
    if (combatEnd) {
      const nextBtn = new ButtonBuilder()
        .setCustomId('combat_next')
        .setLabel('🔄 Next Encounter')
        .setStyle(ButtonStyle.Primary);
      components.push(new ActionRowBuilder().addComponents(nextBtn));
    }

    // Send the embed (and button if applicable)
    const messageReply = await interaction.editReply({
      embeds: [embed],
      components
    });

    // If there's a "Next Encounter" button, set up a collector
    if (combatEnd) {
      const collector = messageReply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000, // 60 seconds to click
        filter: btnInt => btnInt.user.id === interaction.user.id
      });

      collector.on('collect', async btnInt => {
        if (btnInt.customId === 'combat_next') {
          await btnInt.deferUpdate();
          // Recursively invoke this same command to start the next round
          // Note: this will create a new embed/message
          await execute(interaction);
          collector.stop();
        }
      });

      collector.on('end', async collected => {
        // Disable button if time expired
        if (collected.size === 0) {
          const disabledBtn = ButtonBuilder.from(components[0].components[0])
            .setDisabled(true);
          await messageReply.edit({
            components: [new ActionRowBuilder().addComponents(disabledBtn)]
          });
        }
      });
    }

  } catch (err) {
    console.error('Error in /combat command:', err);
    await interaction.editReply({
      content: '❌ An error occurred while resolving combat. Please try again later.',
      ephemeral: true
    });
  }
}