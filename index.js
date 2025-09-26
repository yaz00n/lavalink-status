// ---------------- CONFIG ----------------
const TOKEN = ""; // your bot token
const CLIENT_ID = "1419198009983373335";
const GUILD_ID = "1412831815772667904";
const DEV_ROLE_ID = "1412831815793901579";
const TICKETS_CATEGORY_ID = "1413535890890031104";
const LOGS_CHANNEL_ID = "1419238369103446046";
const FEEDBACK_CHANNEL_ID = "1413588181043122186";
const SUGGESTION_LOG_CHANNEL_ID = "1413473068415975526";

// ---------------- IMPORTS ----------------
const fs = require("node:fs");
const path = require("node:path");
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Collection,
  REST,
  Routes,
  PermissionsBitField,
  ChannelType,
  MessageFlags,
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel],
});

client.commands = new Collection();
const commands = [];
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

// ---------------- STORAGE ----------------
const activeTickets = new Map(); // key = channelId, value = { userId, claimedBy }

// ---------------- REGISTER COMMANDS ----------------
const rest = new REST({ version: "10" }).setToken(TOKEN);
(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);
    const data = await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log(`✅ Successfully reloaded ${data.length} application (/) commands.`);
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

// ---------------- AUTO DELETE MESSAGES ----------------
const AUTO_DELETE_CHANNEL_ID = "1413564722191536129"; // channel to clean
const DELETE_INTERVAL = 5 * 60 * 1000; // 5 minutes

setInterval(async () => {
  try {
    const channel = await client.channels.fetch(AUTO_DELETE_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) return;

    const messages = await channel.messages.fetch({ limit: 100 });
    if (messages.size === 0) return;

    await channel.bulkDelete(messages, true);
    console.log(`🧹 Auto-deleted ${messages.size} messages in #${channel.name}`);
  } catch (error) {
    console.error("Error auto-deleting messages:", error);
  }
}, DELETE_INTERVAL);

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

  const msg = await channel.send({
    content: `<@${interaction.user.id}> <@&${DEV_ROLE_ID}>`,
    embeds: [embed],
    components: [row],
  });
  await msg.pin();

  activeTickets.set(channel.id, { userId: interaction.user.id, claimedBy: null });

  try {
    await interaction.user.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("📩 Ticket Opened")
          .setDescription(`Your order ticket has been created: ${channel}\nOur developers will assist you shortly.`)
          .setColor("Green")
          .setFooter({ text: "Developed By NewGen Studio" }),
      ],
    });
  } catch {}

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
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }
    try {
      await command.execute(interaction, client, activeTickets, createTicket);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "There was an error while executing this command!",
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: "There was an error while executing this command!",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
    return;
  }

  // ---------------- MODAL SUBMISSIONS ----------------
  if (interaction.isModalSubmit()) {
    // FEEDBACK
    if (interaction.customId === "feedback-modal") {
      try {
        const starRating = interaction.fields.getTextInputValue("star-rating");
        const whatYouLike = interaction.fields.getTextInputValue("what-you-like");
        const userExperience = interaction.fields.getTextInputValue("user-experience");
        const improvements = interaction.fields.getTextInputValue("improvements") || "No suggestions provided";
        const recommend = interaction.fields.getTextInputValue("recommend");

        const rating = parseInt(starRating);
        if (isNaN(rating) || rating < 1 || rating > 5) {
          return await interaction.reply({
            content: "❌ **Invalid Rating** - Please provide a rating between 1-5 stars.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const getStarDisplay = rating => "⭐".repeat(rating) + "☆".repeat(5 - rating);
        const ratingInfo = {
          5: { color: 0x00ff00, desc: "Exceptional" },
          4: { color: 0x7ed321, desc: "Great" },
          3: { color: 0xf5a623, desc: "Good" },
          2: { color: 0xff9500, desc: "Fair" },
          1: { color: 0xff3b30, desc: "Poor" },
        }[rating] || { color: 0xf5a623, desc: "Good" };

        const thankYouEmbed = new EmbedBuilder()
          .setColor(0x00d4aa)
          .setTitle("⭐ Thank You for Your Valuable Feedback!")
          .setDescription(
            `**${interaction.user.username}**, thanks for sharing your thoughts about **NewGen Studio**!\n\n` +
              `**Your Rating:** ${getStarDisplay(rating)} **${rating}/5** (${ratingInfo.desc})`
          );

        await interaction.reply({
          embeds: [thankYouEmbed],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId("feedback_received").setLabel("Feedback Received").setStyle(ButtonStyle.Success).setDisabled(true)
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });

        const feedbackChannel = client.channels.cache.get(FEEDBACK_CHANNEL_ID);
        if (feedbackChannel) {
          const feedbackEmbed = new EmbedBuilder()
            .setColor(ratingInfo.color)
            .setTitle("📬 New Feedback Received")
            .addFields(
              { name: "📊 Overall Rating", value: `${getStarDisplay(rating)} ${rating}/5 - *${ratingInfo.desc}*` },
              { name: "💖 What They Like Most", value: whatYouLike },
              { name: "🎯 User Experience", value: userExperience },
              { name: "🔧 Suggested Improvements", value: improvements },
              { name: "🤝 Would Recommend?", value: recommend }
            )
            .setFooter({ text: `Submitted by ${interaction.user.tag}` });
          await feedbackChannel.send({ embeds: [feedbackEmbed] });
        }
      } catch (error) {
        console.error("Error processing feedback modal:", error);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: "**Oops!** Something went wrong while processing your feedback.",
            flags: MessageFlags.Ephemeral,
          });
        }
      }
    }

    // SUGGESTIONS
    else if (interaction.customId === "suggestion-modal") {
      try {
        const suggestionTitle = interaction.fields.getTextInputValue("suggestion-title");
        const detailedProposal = interaction.fields.getTextInputValue("detailed-proposal");

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x00d4aa)
              .setTitle("💡 Suggestion Successfully Submitted!")
              .setDescription(`**${interaction.user.username}**, your suggestion has been received and forwarded for review.`),
          ],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId("suggestion_received_button").setLabel("Suggestion Received").setStyle(ButtonStyle.Success).setDisabled(true)
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });

        const logChannel = await client.channels.fetch(SUGGESTION_LOG_CHANNEL_ID);
        if (logChannel?.isTextBased()) {
          const suggestionLogEmbed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle(`📝 New Suggestion: ${suggestionTitle}`)
            .setDescription(`Submitted by ${interaction.user.tag} at <t:${Math.floor(Date.now() / 1000)}:F>`)
            .addFields({ name: "Detailed Proposal", value: detailedProposal })
            .setTimestamp();
          await logChannel.send({ embeds: [suggestionLogEmbed] });
        }
      } catch (error) {
        console.error("Error processing suggestion modal:", error);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: "**Error:** An unexpected issue occurred while processing your suggestion.",
            flags: MessageFlags.Ephemeral,
          });
        }
      }
    }
  }

// ---------------- BUTTON INTERACTIONS ----------------
if (interaction.isButton()) {
  const channelId = interaction.channel.id;

  // ✅ Create Order Button
  if (interaction.customId === "create_order") {
    const channel = await createTicket(interaction);
    return interaction.reply({
      content: `✅ Your ticket has been created: ${channel}`,
      flags: MessageFlags.Ephemeral,
    });
  }

  // 💰 Prices Button
// 💰 Prices Button
if (interaction.customId === "view_prices") {
  const pricesEmbed = new EmbedBuilder()
    .setTitle("💰 Bot Pricing")
    .setDescription(
      "> <:dollar:1413958046610358494> **Security Bot**\n" +
      "> 1.99$ / 10 Invites --> 1 Month\n" +
      "> 4.99$ / 25 Invites --> 3 Months\n" +
      "> 9.99$ / 50 Invites --> 12 Months\n" +
      "> 14.99$ / No Invites Payment --> Lifetime\n\n" +

      "> <:dollar:1413958046610358494> **Economy Bot**\n" +
      "> 1.99$ / 10 Invites --> 1 Month\n" +
      "> 4.99$ / 25 Invites --> 3 Months\n" +
      "> 9.99$ / 50 Invites --> 12 Months\n" +
      "> 14.99$ / No Invites Payment --> Lifetime\n\n" +

      "> <:dollar:1413958046610358494> **Music Bot**\n" +
      "> 1.99$ / 10 Invites --> 1 Month\n" +
      "> 4.99$ / 25 Invites --> 3 Months\n" +
      "> 9.99$ / 50 Invites --> 12 Months\n" +
      "> 14.99$ / No Invites Payment --> Lifetime\n\n" +

      "> <:dollar:1413958046610358494> **Ticket System Bot**\n" +
      "> 1.99$ / 10 Invites --> 1 Month\n" +
      "> 4.99$ / 25 Invites --> 3 Months\n" +
      "> 9.99$ / 50 Invites --> 12 Months\n" +
      "> 14.99$ / No Invites Payment --> Lifetime\n\n" +

      "> <:dollar:1413958046610358494> **Multipurpose Bot**\n" +
      "> 2.99$ / 10 Invites --> 1 Month\n" +
      "> 7.99$ / 25 Invites --> 3 Months\n" +
      "> 12.99$ / 50 Invites --> 12 Months\n" +
      "> 19.99$ / No Invites Payment --> Lifetime\n\n" +

      "🔗 **Payment Options**  \n" +
      "- 💳 Visa / Mastercard / AMEX / PayPal / Server Boost\n" +
      "- 📨 Invites Payment Method *(Members you invite must stay in the server)*\n" +
      "- 🚀 Boosts Payment Method *(Your bot stays online as long as you boost, otherwise it will be turned off)*"
    )
    .setColor("Gold")
    .setFooter({ text: "Developed By NewGen Studio" });

  return interaction.reply({
    embeds: [pricesEmbed],
    flags: MessageFlags.Ephemeral, // private to the user
  });
}


  // 🛒 Products Button
// 🛒 Products Button
if (interaction.customId === "view_products") {
  const productsEmbed = new EmbedBuilder()
    .setTitle("🛒 Our Products")
    .setDescription(
      "🛡️ **Security Bot**\n" +
      "> - Security Protection Commands  \n" +
      "> - Antinuke System  \n" +
      "> - Multi Security Features  \n" +
      "> - 24/7 Uptime - Fast Hosting\n\n" +

      "🕹️ **Economy Bot**\n" +
      "> - Economy System Commands  \n" +
      "> - Personal Coin System  \n" +
      "> - Mini Games & Events  \n" +
      "> - 24/7 Uptime - Fast Hosting\n\n" +

      "🎫 **Ticket System Bot**\n" +
      "> - Ticket Panel Commands  \n" +
      "> - Multi Ticket Panels  \n" +
      "> - Mod Mail Support For Tickets  \n" +
      "> - 24/7 Uptime - Fast Hosting\n\n" +

      "🎶 **Music Bot**\n" +
      "> - Best Player Sounds System  \n" +
      "> - Fastest Lavalink Nodes  \n" +
      "> - Supports YouTube Links  \n" +
      "> - Premium Support  \n" +
      "> - Multifunction Music System  \n" +
      "> - 24/7 Uptime - Fast Hosting\n\n" +

      "🥇 **Manager System Bot**\n" +
      "> - Over 500+ Commands  \n" +
      "> - Includes All Bot Systems  \n" +
      "> - Premium Support  \n" +
      "> - Custom Commands  \n" +
      "> - 24/7 Uptime - Fast Hosting\n\n" +

      "⛏️ **Custom Discord Bot**\n" +
      "> - Depends On Customers Need  \n" +
      "> - We Provide All Types Of Bots  \n" +
      "> - Premium Support  \n" +
      "> - Custom Commands  \n" +
      "> - 24/7 Uptime - Fast Hosting"
    )
    .setColor("Blue")
    .setFooter({ text: "Developed By NewGen Studio" });

  return interaction.reply({
    embeds: [productsEmbed],
    flags: MessageFlags.Ephemeral, // private to the user
  });
}


  // 🎟️ Ticket Management
  if (interaction.customId === "claim_ticket") {
    const ticket = activeTickets.get(channelId);
    if (!ticket) return interaction.reply({ content: "❌ Ticket not found.", flags: MessageFlags.Ephemeral });
    if (ticket.claimedBy) return interaction.reply({ content: `❌ Already claimed by <@${ticket.claimedBy}>`, flags: MessageFlags.Ephemeral });

    ticket.claimedBy = interaction.user.id;
    activeTickets.set(channelId, ticket);

    await interaction.reply({ content: `✅ <@${interaction.user.id}> has claimed this ticket!` });
  }

  if (interaction.customId === "complete_ticket") {
    const ticket = activeTickets.get(channelId);
    if (!ticket) return;
    if (ticket.claimedBy && ticket.claimedBy !== interaction.user.id) {
      return interaction.reply({ content: `❌ Only <@${ticket.claimedBy}> can complete this ticket.`, flags: MessageFlags.Ephemeral });
    }

    activeTickets.delete(channelId);
    await interaction.reply({ content: "✅ Ticket marked as completed." });
  }

  if (interaction.customId === "delete_ticket") {
    const ticket = activeTickets.get(channelId);
    activeTickets.delete(channelId);
    await interaction.channel.delete().catch(() => {});
  }
  }
}); // <-- closes the client.on("interactionCreate") listener

// ---------------- LOGIN ----------------
client.login(TOKEN);