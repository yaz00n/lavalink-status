const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup_panel")
    .setDescription("Setup the order panel in a channel")
    .addChannelOption(opt =>
      opt.setName("channel").setDescription("Channel to send the panel in").setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({
        content: "❌ You don't have permission to use this command.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const channel = interaction.options.getChannel("channel");

    const embed = new EmbedBuilder()
      .setTitle("📦 Order Your Personal Discord Bot")
      .setDescription(
        "🚀 **Welcome to NewGen Bot Shop**\nYour gateway to premium, modular Discord bots.\n\n" +
          "🛍️ **How to Order:**\n" +
          "1. Click **Create An Order** — this will open a private ticket just for you.\n" +
          "2. Follow the prompts inside your ticket.\n" +
          "3. Our developers will assist and finalize your request.\n\n" +
          "✨ Whether you're after sleek automation, layered interactivity, or custom branding — we build bots that feel like products.\n" +
          "Let’s get started!"
      )
      .setColor("Blue")
      .setFooter({ text: "Developed By NewGen Studio" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("create_order")
        .setLabel("Create An Order")
        .setStyle(ButtonStyle.Success)
        .setEmoji("🏪"),
      new ButtonBuilder()
        .setCustomId("view_prices")
        .setLabel("View Prices")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("💰"),
      new ButtonBuilder()
        .setCustomId("view_products")
        .setLabel("View Products")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🛒")
    );

    await channel.send({
      embeds: [embed],
      components: [row],
    });

    await interaction.reply({
      content: `✅ Panel sent to ${channel}`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
