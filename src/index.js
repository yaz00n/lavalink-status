const {
    Client,
    GatewayIntentBits,
    Partials,
    PermissionsBitField,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Events,
    EmbedBuilder,
    ActivityType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    InteractionType
} = require("discord.js");
const { readdirSync } = require("fs");
const colors = require("colors");

const Manager = require("./wrapper/index");
const { token, nodes, webMonitor } = require("./config");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel, Partials.Message]
});

// 🌐 Lavalink Manager
client.manager = new Manager(client, { nodes });

// 🧠 Error Handling
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

// 📦 Load Events
readdirSync("./src/events/").forEach((file) => {
    const event = require(`./events/${file}`);
    const eventName = file.split(".")[0];
    console.log(colors.green(`[EVENTS] Loaded [${client._eventsCount}] events`));
    client.on(eventName, event.bind(null, client));
});

// 🚀 Bot Ready
client.once("ready", async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);

    const statuses = [
        { type: ActivityType.Playing, name: "Order Manager 🏪" },
        { type: ActivityType.Watching, name: `${client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0)} members` }
    ];

    let index = 0;
    setInterval(() => {
        if (statuses[index].type === ActivityType.Watching) {
            statuses[index].name = `${client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0)} members`;
        }
        client.user.setActivity(statuses[index].name, { type: statuses[index].type });
        index = (index + 1) % statuses.length;
    }, 60000);
});

// 🛒 Order Ticket Setup
client.on(Events.MessageCreate, async (message) => {
    if (message.content === "!setuporder") {
        const embed = new EmbedBuilder()
            .setTitle("📦 Order Ticket")
            .setDescription("Welcome to our order system!\nClick the button below to create a new order ticket.\n\n💡 **Guidelines:**\n• Provide clear details.\n• Be patient while a developer responds.")
            .setColor(0x2b2d31)
            .setFooter({ text: "Your satisfaction is our priority 💜", iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        const createButton = new ButtonBuilder()
            .setCustomId("create_order")
            .setLabel("📦 Create Order")
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(createButton);
        await message.channel.send({ embeds: [embed], components: [row] });
    }

    if (message.content === "!review") {
        const reviewEmbed = new EmbedBuilder()
            .setTitle("📝 Submit Your Review")
            .setDescription("We highly value your feedback and kindly request your participation in a brief review to assist us in enhancing our services.")
            .setColor(0x2b2d31)
            .setFooter({ text: "⭐ Request created at: " + new Date().toLocaleTimeString(), iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        const reviewButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("submit_review")
                .setLabel("Submit A Review")
                .setStyle(ButtonStyle.Success)
        );

        await message.channel.send({ embeds: [reviewEmbed], components: [reviewButtons] });
    }
});

// 🎯 Interaction Handler
client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.customId === "create_order") {
        const categoryId = "1413535890890031104";
        const staffRoleId = "1412831815793901579";

        const channel = await interaction.guild.channels.create({
            name: `order-${interaction.user.username}`,
            type: 0,
            parent: categoryId,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
            ]
        });

        const ticketEmbed = new EmbedBuilder()
            .setTitle("📦 Order Ticket")
            .setDescription(
`Hello ${interaction.user}, welcome to our ordering system!  
Please fill in the answers below so our developers can fulfill your order:

\`\`\`
1 - What type of discord bot are you choosing to order from #〔🛍️〕products 
2 - What would you like to name your bot?*
3 - What is your discord ID?*
4 - What would you like your bot’s profile picture to be?
5 - What would like your bot’s status to be? (Ex: Playing: NewGen Studio)*
6 - How would you like to pay for your bot via PayPal/Credit Card/Invites/Bank Transfer*
7 - How long would you like to host your bot (Ex: 1 Month, 5 Months)*
8 - What prefix would you like for your bot?*
9 - Any other add-ons to your discord bot?
\`\`\`
<:ok:1413845645084725382> **Note:** Anything with a \`*\` is required for your order!`
            )
            .setColor(0x2b2d31)
            .setFooter({ text: "💜 Your satisfaction is our priority", iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("close_ticket").setLabel("📕 Close Ticket").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("claim_ticket").setLabel("🎯 Claim Ticket").setStyle(ButtonStyle.Secondary)
        );

        await channel.send({ content: `<@&${staffRoleId}> ${interaction.user}`, embeds: [ticketEmbed], components: [row] });

        const dmEmbed = new EmbedBuilder()
            .setTitle("📦 Ticket Created")
            .setDescription(`Your order ticket has been opened in **${interaction.guild.name}**.\nPlease describe your order in the channel: ${channel}`)
            .setColor(0x2b2d31)
            .setTimestamp();

        await interaction.user.send({ embeds: [dmEmbed] }).catch(() => console.log(`❌ Could not DM ${interaction.user.tag}`));
        await interaction.reply({ content: `✅ Your order ticket has been created: ${channel}`, ephemeral: true });
    }

    if (interaction.customId === "close_ticket") {
        const closeEmbed = new EmbedBuilder()
            .setTitle("📕 Ticket Closed")
            .setDescription(`Your order ticket in **${interaction.guild.name}** has been closed.\nThank you for reaching out!`)
            .setColor(0xff0000)
            .setTimestamp();

        await interaction.user.send({ embeds: [closeEmbed] }).catch(() => console.log(`❌ Could not DM ${interaction.user.tag}`));
        await interaction.channel.send({ embeds: [closeEmbed] });

        const ORDER_LOG_CHANNEL_ID = "1414807932457193612";
        const logChannel = interaction.guild.channels.cache.get(ORDER_LOG_CHANNEL_ID);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle("📦 Order Ticket Closed")
                .setColor(0xffa500)
                .addFields(
                    { name: "Closed By", value: `${interaction.user.tag}`, inline: true },
                    { name: "Ticket Name", value: `${interaction.channel.name}`, inline: true },
                    { name: "Closed At", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
                )
                .setFooter({ text: `Guild: ${interaction.guild.name}`, iconURL: interaction.guild.iconURL() })
                .setTimestamp();

            await logChannel.send({ embeds: [logEmbed] }).catch(() => console.log("❌ Could not send order log"));
        }

        await interaction.channel.delete();
    }

    if (interaction.customId === "claim_ticket") {
        const claimedBy = interaction.user;

        const claimEmbed = new EmbedBuilder()
            .setTitle("📩 Ticket Claimed")
            .setDescription(`🎯 This ticket has been claimed by ${claimedBy}.`)
            .setColor(0x5865f2)
            .setTimestamp();

        const updatedRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("close_ticket").setLabel("📕 Close Ticket").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("claimed").setLabel(`⚙️ Claimed by ${claimedBy.username}`).setStyle(ButtonStyle.Secondary).setDisabled(true)
        );

        await interaction.update({ components: [updatedRow] });
        await interaction.channel.send({ embeds: [claimEmbed] });
    }

    // 📝 Review Modal Trigger
    if (interaction.customId === "submit_review") {
        const modal = new ModalBuilder()
            .setCustomId("review_modal")
            .setTitle("📝 Submit Your Review");

        const ratingInput = new TextInputBuilder()
            .setCustomId("review_rating")
            .setLabel("What rating would you like to give? (1–5) *")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(1)
            .setPlaceholder("Enter a number between 1 and 5");

        const descriptionInput = new TextInputBuilder()
            .setCustomId("review_description")
            .setLabel("Description of your review *")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1000)
            .setPlaceholder("Write your feedback here...");

        modal.addComponents(
            new ActionRowBuilder().addComponents(ratingInput),
            new ActionRowBuilder().addComponents(descriptionInput)
        );

        await interaction.showModal(modal);
    }

    // 🧾 Handle Modal Submission
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === "review_modal") {
        const rating = interaction.fields.getTextInputValue("review_rating");
        const description = interaction.fields.getTextInputValue("review_description");

        if (!["1", "2", "3", "4", "5"].includes(rating)) {
            return interaction.reply({ content: "❌ Please enter a valid rating between 1 and 5.", ephemeral: true });
        }

        const reviewChannelId = "YOUR_REVIEW_CHANNEL_ID"; // Replace with your actual review channel ID
        const reviewChannel = interaction.guild.channels.cache.get(reviewChannelId);
        if (!reviewChannel) return interaction.reply({ content: "❌ Review channel not found.", ephemeral: true });

const reviewEmbed = new EmbedBuilder()
    .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
    .setTitle(`${"⭐".repeat(Number(rating))} (${rating}/5)`)
    .setDescription(description)
    .setColor(0x2b2d31)
    .setThumbnail(interaction.user.displayAvatarURL())
    .setFooter({ text: `Review ID: ${Math.random().toString(36).substring(2, 10)}`, iconURL: client.user.displayAvatarURL() })
    .setTimestamp();


        const reviewButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("report_review").setLabel("Report").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("submit_review").setLabel("Submit A Review").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("useful_review").setLabel("Useful").setStyle(ButtonStyle.Secondary)
        );

        await reviewChannel.send({ embeds: [reviewEmbed], components: [reviewButtons] });
        await interaction.reply({ content: "✅ Your review has been submitted!", ephemeral: true });
    }

    // 🛡️ Handle Report Review
    if (interaction.customId === "report_review") {
        const reportChannelId = "1415393968027340934";
        const reportChannel = interaction.guild.channels.cache.get(reportChannelId);
        if (!reportChannel) return interaction.reply({ content: "❌ Report channel not found.", ephemeral: true });

        const reportedMessage = await interaction.message.fetch().catch(() => null);
        if (!reportedMessage) return interaction.reply({ content: "❌ Could not fetch the review message.", ephemeral: true });

        const reportEmbed = new EmbedBuilder()
            .setTitle("🚨 Review Reported")
            .setColor(0xff0000)
            .addFields(
                { name: "Reported By", value: `${interaction.user.tag}`, inline: true },
                { name: "Review Author", value: `${reportedMessage.embeds[0]?.author?.name || "Unknown"}`, inline: true },
                { name: "Review Content", value: reportedMessage.embeds[0]?.description || "No description provided", inline: false },
                { name: "Review ID", value: reportedMessage.embeds[0]?.footer?.text || "N/A", inline: false }
            )
            .setTimestamp()
            .setFooter({ text: `Guild: ${interaction.guild.name}`, iconURL: interaction.guild.iconURL() });

        await reportChannel.send({ embeds: [reportEmbed] });
        await interaction.reply({ content: "✅ Review has been reported.", ephemeral: true });
    }

    // ❤️ Handle Useful Review
    if (interaction.customId === "useful_review") {
        const reviewMessage = await interaction.message.fetch().catch(() => null);
        if (!reviewMessage) return interaction.reply({ content: "❌ Could not fetch the review message.", ephemeral: true });

        await reviewMessage.react("❤️").catch(() => {});
        await interaction.reply({ content: "💖 Thanks for marking this review as useful!", ephemeral: true });
    }
});


// 🧹 Auto-delete messages
const AUTO_DELETE_CHANNEL_ID = "1413564722191536129";
const DELETE_INTERVAL_MS = 5 * 60 * 1000;

setInterval(async () => {
    const channel = await client.channels.fetch(AUTO_DELETE_CHANNEL_ID).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    try {
        const messages = await channel.messages.fetch({ limit: 100 });
        const now = Date.now();

        messages.forEach(msg => {
            if (now - msg.createdTimestamp > DELETE_INTERVAL_MS) {
                msg.delete().catch(() => {});
            }
        });
    } catch (err) {
        console.error("❌ Auto-delete error:", err);
    }
}, DELETE_INTERVAL_MS);

// 🌐 Optional Web Monitor
if (webMonitor === true) {
    require("./web/server");
}

// 🔐 Login
client.login(token);
