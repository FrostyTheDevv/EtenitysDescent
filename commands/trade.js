// src/commands/trade.js

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
 * /trade
 * Subcommands:
 *   • propose – Propose a trade to another player
 *   • accept  – Accept a pending trade by ID
 *   • cancel  – Cancel a pending trade by ID
 */
export const data = new SlashCommandBuilder()
  .setName('trade')
  .setDescription('🤝 Player‐to‐player trading commands')
  .addSubcommand(sub =>
    sub
      .setName('propose')
      .setDescription('Propose a trade to another player')
      .addUserOption(opt =>
        opt
          .setName('target')
          .setDescription('The user you want to trade with')
          .setRequired(true)
      )
      .addStringOption(opt =>
        opt
          .setName('item_id')
          .setDescription('The ID of the item you offer')
          .setRequired(true)
      )
      .addIntegerOption(opt =>
        opt
          .setName('quantity')
          .setDescription('Quantity of the offered item')
          .setRequired(true)
      )
      .addStringOption(opt =>
        opt
          .setName('request_item_id')
          .setDescription('The ID of the item you want in return')
          .setRequired(true)
      )
      .addIntegerOption(opt =>
        opt
          .setName('request_quantity')
          .setDescription('Quantity of the requested item')
          .setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('accept')
      .setDescription('Accept a pending trade')
      .addIntegerOption(opt =>
        opt
          .setName('trade_id')
          .setDescription('The ID of the trade to accept')
          .setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('cancel')
      .setDescription('Cancel a pending trade you initiated')
      .addIntegerOption(opt =>
        opt
          .setName('trade_id')
          .setDescription('The ID of the trade to cancel')
          .setRequired(true)
      )
  );

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: false });
  const sub = interaction.options.getSubcommand();

  try {
    if (sub === 'propose') {
      const fromUser = interaction.user.id;
      const toUser = interaction.options.getUser('target').id;
      const itemId = interaction.options.getString('item_id');
      const qty = interaction.options.getInteger('quantity');
      const reqItemId = interaction.options.getString('request_item_id');
      const reqQty = interaction.options.getInteger('request_quantity');

      const res = await httpClient.post('/trade/initiate', {
        from_user: fromUser,
        to_user: toUser,
        item_offer: { item_id: itemId, quantity: qty },
        item_request: { item_id: reqItemId, quantity: reqQty }
      });

      const { success, trade_id, error } = res.data;
      if (!success) {
        await interaction.editReply(`❌ Could not initiate trade: ${error}`);
        return;
      }

      // Notify both parties
      const embed = new EmbedBuilder()
        .setTitle('🤝 Trade Proposal Sent')
        .setDescription(
          `Trade ID **${trade_id}**\n` +
          `<@${fromUser}> offers **${qty}× ${itemId}**\n` +
          `in exchange for **${reqQty}× ${reqItemId}** from <@${toUser}>`
        )
        .setColor(0x00CCFF)
        .setTimestamp();

      // Buttons to accept or cancel (for the target)
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`trade_accept_${trade_id}`)
          .setLabel('Accept')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`trade_cancel_${trade_id}`)
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.editReply({ embeds: [embed], components: [row] });

      // Set up a collector for the target user
      const message = await interaction.fetchReply();
      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 120_000, // 2 minutes
        filter: btn => btn.user.id === toUser
      });

      collector.on('collect', async btn => {
        await btn.deferUpdate();
        const [action, , idStr] = btn.customId.split('_');
        const tradeId = parseInt(idStr, 10);

        // Call accept or cancel endpoint
        const endpoint = action === 'trade' && btn.customId.startsWith('trade_accept')
          ? 'accept' : 'cancel';
        const resp = await httpClient.post(`/trade/${endpoint}`, {
          user_id: btn.user.id,
          trade_id: tradeId
        });
        const { success: ok, error: errMsg } = resp.data;

        if (!ok) {
          await interaction.editReply(`❌ ${errMsg}`);
        } else {
          const outcomeEmbed = new EmbedBuilder()
            .setTitle(action === 'trade_accept' ? '✅ Trade Completed' : '❌ Trade Cancelled')
            .setDescription(`Trade ID **${tradeId}** has been ${action === 'trade_accept' ? 'accepted' : 'cancelled'}.`)
            .setColor(action === 'trade_accept' ? 0x00FF00 : 0xFF5555)
            .setTimestamp();
          await interaction.editReply({ embeds: [outcomeEmbed], components: [] });
        }

        collector.stop();
      });

      collector.on('end', async collected => {
        if (collected.size === 0) {
          await interaction.editReply({
            content: '⌛ The trade offer has expired.',
            embeds: [],
            components: []
          });
        }
      });

    } else if (sub === 'accept' || sub === 'cancel') {
      // Handle direct subcommand usage
      const tradeId = interaction.options.getInteger('trade_id');
      const endpoint = sub; // 'accept' or 'cancel'
      const res = await httpClient.post(`/trade/${endpoint}`, {
        user_id: interaction.user.id,
        trade_id: tradeId
      });
      const { success, error } = res.data;
      if (!success) {
        await interaction.editReply(`❌ ${error}`);
      } else {
        await interaction.editReply(
          sub === 'accept'
            ? `✅ You have accepted trade **${tradeId}**.`
            : `❌ You have cancelled trade **${tradeId}**.`
        );
      }
    }
  } catch (err) {
    console.error('Error in /trade command:', err);
    await interaction.editReply({
      content: '❌ An error occurred while processing the trade. Please try again later.',
      ephemeral: true
    });
  }
}