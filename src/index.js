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
    ActivityType
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
});

// 🎯 Interaction Handler
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;

    const user = interaction.user;
    const guild = interaction.guild;

if (interaction.customId === "create_order") {
    const categoryId = "1413535890890031104";
    const staffRoleId = "1412831815793901579";

    const channel = await guild.channels.create({
        name: `order-${user.username}`,
        type: 0,
        parent: categoryId,
        permissionOverwrites: [
            { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
            { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
        ]
    });

    // 🆕 Combined Embed with Questionnaire
    const ticketEmbed = new EmbedBuilder()
        .setTitle("📦 Order Ticket")
        .setDescription(
`Hello ${user}, welcome to our ordering system!  
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

    await channel.send({ content: `<@&${staffRoleId}> ${user}`, embeds: [ticketEmbed], components: [row] });

    // DM confirmation
    const dmEmbed = new EmbedBuilder()
        .setTitle("📦 Ticket Created")
        .setDescription(`Your order ticket has been opened in **${guild.name}**.\nPlease describe your order in the channel: ${channel}`)
        .setColor(0x2b2d31)
        .setTimestamp();

    await user.send({ embeds: [dmEmbed] }).catch(() => console.log(`❌ Could not DM ${user.tag}`));
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

        // 📝 Order Log
        const ORDER_LOG_CHANNEL_ID = "1414807932457193612"; // TODO: Replace with your real log channel ID
        const logChannel = guild.channels.cache.get(ORDER_LOG_CHANNEL_ID);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle("📦 Order Ticket Closed")
                .setColor(0xffa500)
                .addFields(
                    { name: "Closed By", value: `${interaction.user.tag}`, inline: true },
                    { name: "Ticket Name", value: `${interaction.channel.name}`, inline: true },
                    { name: "Closed At", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
                )
                .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() })
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
