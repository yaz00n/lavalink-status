// ---------------- CONFIG ----------------
const TOKEN = "MTQxOTE5ODAwOTk4MzM3MzMzNQ.GClxQW.DXGS85pO2UqRdvuR2ckx6tUtvr8pS9sLjH0Sjw"; // your bot token
const CLIENT_ID = "1419198009983373335";
const GUILD_ID = "1412831815772667904";
const DEV_ROLE_ID = "1412831815793901579";
const TICKETS_CATEGORY_ID = "1413535890890031104";
const LOGS_CHANNEL_ID = "1419238369103446046";

// ---------------- IMPORTS ----------------
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  REST,
  Routes,
  PermissionsBitField,
  ChannelType,
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

// ---------------- STORAGE ----------------
const activeTickets = new Map(); // key = channelId, value = { userId, claimedBy }

// ---------------- SLASH COMMANDS ----------------
const commands = [
  new SlashCommandBuilder()
    .setName("setup_panel")
    .setDescription("Setup the order panel in a channel")
    .addChannelOption(opt => opt.setName("channel").setDescription("Channel to send the panel in").setRequired(true)),
  new SlashCommandBuilder().setName("uptime").setDescription("Show bot uptime"),
  new SlashCommandBuilder().setName("ping").setDescription("Check bot ping"),
  new SlashCommandBuilder()
    .setName("sendorder")
    .setDescription("Send completed order embed")
    .addUserOption(opt => opt.setName("user").setDescription("User to ping").setRequired(true))
    .addStringOption(opt => opt.setName("invitelink").setDescription("Bot invite link").setRequired(true)),
].map(c => c.toJSON());

// ---------------- REGISTER COMMANDS ----------------
const rest = new REST({ version: "10" }).setToken(TOKEN);
(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log("✅ Commands registered");
  } catch (e) {
    console.error(e);
  }
})();

// ---------------- READY ----------------
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: "Order Now 🏪", type: 0 }],
    status: "online",
  });
  client.startTime = Date.now();
});

// ---------------- HELPER FUNCTIONS ----------------
async function createTicket(interaction) {
  const channel = await interaction.guild.channels.create({
    name: `order-${interaction.user.username}`,
    type: ChannelType.GuildText,
    parent: TICKETS_CATEGORY_ID || null,
    permissionOverwrites: [
      { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
      { id: DEV_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
      { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
    ],
  });

  const embed = new EmbedBuilder()
    .setTitle("# Your Custom Bot Order 🛒")
    .setDescription(
      `Hello <@${interaction.user.id}>! We appreciate you initiating an order with us. A developer will connect with you very soon. 🚀\n\n` +
      `Please provide the following critical details:\n` +
      `* **Bot Name:** The official name you wish to assign to your bot. 🤖\n` +
      `* **Bot Avatar (URL):** A direct link (URL) to the image you'd like your bot to use as its profile picture. 🖼️\n` +
      `* **Hosting Term:** Desired duration (e.g., monthly, annually). 🗓️\n` +
      `* **Command Prefix:** Character/string for commands (e.g., \`!\`, \`-\`). 💬\n` +
      `* **Operational Language:** Primary bot language. 🌍\n` +
      `* **Discord User ID:** For tracking and communication. 🆔\n` +
      `* **Initial Status/Activity:** Default bot presence (e.g., "Playing …"). ✨\n` +
      `* **Additional Specifications:** Further details or custom requirements. 📝\n` +
      `* **Preferred Payment Method:** Payment method for the service. 💳`
    )
    .setColor("Green")
    .setFooter({ text: "Developed By NewGen Studio" });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("claim_ticket").setLabel("Claim Ticket").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("complete_ticket").setLabel("Mark Completed").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("delete_ticket").setLabel("Delete Ticket").setStyle(ButtonStyle.Danger)
  );

  const msg = await channel.send({ content: `<@${interaction.user.id}> <@&${DEV_ROLE_ID}>`, embeds: [embed], components: [row] });
  await msg.pin();

  activeTickets.set(channel.id, { userId: interaction.user.id, claimedBy: null });

  // DM user
  try {
    await interaction.user.send({ embeds: [new EmbedBuilder().setTitle("📩 Ticket Opened").setDescription(`Your order ticket has been created: ${channel}\nOur developers will assist you shortly.`).setColor("Green").setFooter({ text: "Developed By NewGen Studio" })] });
  } catch {}

  // Log ticket creation
  logTicket(channel, interaction.user.id, "opened");

  return channel;
}

// ---------------- LOGGING FUNCTION ----------------
async function logTicket(channel, userId, action) {
  const logsChannel = client.channels.cache.get(LOGS_CHANNEL_ID);
  if (!logsChannel) return;
  const embed = new EmbedBuilder()
    .setTitle(`📝 Ticket ${action}`)
    .setDescription(`<@${userId}>'s ticket: ${channel}`)
    .setColor(action === "opened" ? "Green" : "Blue")
    .setFooter({ text: "Developed By NewGen Studio" });

  await logsChannel.send({ embeds: [embed] });
}

// ---------------- INTERACTIONS ----------------
client.on("interactionCreate", async interaction => {

  // ---------------- SLASH COMMANDS ----------------
  if (interaction.isChatInputCommand()) {
    const { commandName } = interaction;

    // ---------------- SETUP PANEL ----------------
    if (commandName === "setup_panel") {
      const channel = interaction.options.getChannel("channel");
      const embed = new EmbedBuilder()
        .setTitle("📦 Order Your Personal Discord Bot")
        .setDescription(
          "**Welcome to our Bot Shop!**\n\n🛍️ **How to Order:**\n" +
          "1. Click **Create An Order** to open a ticket.\n" +
          "2. Follow instructions in the ticket.\n" +
          "3. Developers will assist you."
        )
        .setColor("Blue")
        .setFooter({ text: "Developed By NewGen Studio" });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("create_order").setLabel("Create An Order").setStyle(ButtonStyle.Success).setEmoji("🏪")
      );

      await channel.send({ embeds: [embed], components: [row] });
      await interaction.reply({ content: `✅ Panel sent to ${channel}`, ephemeral: true });
    }

    // ---------------- UPTIME ----------------
    if (commandName === "uptime") {
      const uptime = Date.now() - client.startTime;
      const sec = Math.floor((uptime / 1000) % 60);
      const min = Math.floor((uptime / (1000 * 60)) % 60);
      const hrs = Math.floor((uptime / (1000 * 60 * 60)) % 24);
      const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
      const embed = new EmbedBuilder().setTitle("⏱️ Uptime").setDescription(`${days}d ${hrs}h ${min}m ${sec}s`).setColor("Blue");
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // ---------------- PING ----------------
    if (commandName === "ping") {
      const embed = new EmbedBuilder().setTitle("🏓 Pong!").setDescription(`Latency: ${client.ws.ping}ms`).setColor("Yellow");
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // ---------------- SEND ORDER ----------------
    if (commandName === "sendorder") {
      const user = interaction.options.getUser("user");
      const invite = interaction.options.getString("invitelink");
      const embed = new EmbedBuilder()
        .setTitle("<:cart:1415352155736375418> Hey, your order is ready!")
        .setDescription(`**<@${user.id}> Your Discord Bot is officially completed!**\n\n🔗 [Invite Your Bot](${invite})`)
        .setColor("Gold")
        .setFooter({ text: "Developed By NewGen Studio" });

      await interaction.reply({ content: `Hey <@${user.id}>, your order is ready!`, embeds: [embed], allowedMentions: { users: [user.id] } });
    }
  }

  // ---------------- BUTTON INTERACTIONS ----------------
  if (interaction.isButton()) {
    const channelId = interaction.channel.id;

    // CREATE ORDER
    if (interaction.customId === "create_order") {
      const channel = await createTicket(interaction);
      await interaction.reply({ content: `✅ Your ticket has been created: ${channel}`, ephemeral: true });
    }

    // CLAIM TICKET
    if (interaction.customId === "claim_ticket") {
      const ticket = activeTickets.get(channelId);
      if (!ticket) return interaction.reply({ content: "❌ Ticket not found.", ephemeral: true });
      if (ticket.claimedBy) return interaction.reply({ content: `❌ Already claimed by <@${ticket.claimedBy}>`, ephemeral: true });

      ticket.claimedBy = interaction.user.id;
      activeTickets.set(channelId, ticket);

      // Update embed footer
      const messages = await interaction.channel.messages.fetch({ limit: 10 });
      const ticketMsg = messages.find(m => m.author.id === client.user.id && m.components.length > 0);
      if (ticketMsg) {
        const embed = EmbedBuilder.from(ticketMsg.embeds[0]).setFooter({ text: `Claimed by ${interaction.user.tag} | Developed By NewGen Studio` });
        await ticketMsg.edit({ embeds: [embed] });
      }

      await interaction.reply({ content: `✅ <@${interaction.user.id}> has claimed this ticket!`, ephemeral: false });
    }

    // COMPLETE TICKET
    if (interaction.customId === "complete_ticket") {
      const ticket = activeTickets.get(channelId);
      if (!ticket) return;
      if (ticket.claimedBy && ticket.claimedBy !== interaction.user.id) return interaction.reply({ content: `❌ Only <@${ticket.claimedBy}> can complete this ticket.`, ephemeral: true });

      activeTickets.delete(channelId);
      await interaction.reply({ content: "✅ Ticket marked as completed.", ephemeral: false });

      try {
        const user = await client.users.fetch(ticket.userId);
        await user.send({ embeds: [new EmbedBuilder().setTitle("✅ Ticket Completed").setDescription(`Your ticket <#${channelId}> has been completed.`).setColor("Blue").setFooter({ text: "Developed By NewGen Studio" })] });
      } catch {}

      logTicket(interaction.channel, ticket.userId, "completed");
    }

    // DELETE TICKET
    if (interaction.customId === "delete_ticket") {
      const ticket = activeTickets.get(channelId);
      activeTickets.delete(channelId);

      if (ticket) {
        try {
          const user = await client.users.fetch(ticket.userId);
          await user.send({ embeds: [new EmbedBuilder().setTitle("🗑️ Ticket Deleted").setDescription(`Your ticket <#${channelId}> has been deleted.`).setColor("Red").setFooter({ text: "Developed By NewGen Studio" })] });
        } catch {}
      }

      await interaction.channel.delete().catch(() => {});
    }
  }
});

// ---------------- LOGIN ----------------
client.login(TOKEN);
