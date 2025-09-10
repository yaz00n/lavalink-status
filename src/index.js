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
    TextInputStyle
} = require("discord.js");

const { readdirSync } = require("fs");
const colors = require("colors");

const Manager = require("./wrapper/index");

// === SETTINGS (edit these!) ===
const webMonitor = true; // set false if not using web monitor
const categoryId = "1413535890890031104"; // ticket category ID
const staffRoleId = "1412831815793901579"; // staff role ID
const orderLogChannelId = "1414807932457193612"; // log channel ID
const autoDeleteChannelId = "1413564722191536129"; // auto-delete channel ID
const reviewChannelId = "1413564722191536129"; // channel where reviews go
// ==============================

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

// 📝 Reminder Storage (in production, use a database)
const reminders = new Map();

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

    // 🔔 Start reminder checker
    startReminderChecker();
});

// === REVIEW SYSTEM ===
client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isButton()) {
        if (interaction.customId === "leave_review") {
            const modal = new ModalBuilder()
                .setCustomId("review_modal")
                .setTitle("📝 Leave a Review");

            const ratingInput = new TextInputBuilder()
                .setCustomId("review_rating")
                .setLabel("⭐ Rating (1-5)")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("e.g. 5")
                .setRequired(true);

            const commentInput = new TextInputBuilder()
                .setCustomId("review_comment")
                .setLabel("💬 Comment")
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder("Write your feedback...")
                .setRequired(true);

            const row1 = new ActionRowBuilder().addComponents(ratingInput);
            const row2 = new ActionRowBuilder().addComponents(commentInput);

            modal.addComponents(row1, row2);
            await interaction.showModal(modal);
        }
    }

    if (interaction.isModalSubmit()) {
        if (interaction.customId === "review_modal") {
            const rating = interaction.fields.getTextInputValue("review_rating");
            const comment = interaction.fields.getTextInputValue("review_comment");

            const reviewEmbed = new EmbedBuilder()
                .setTitle("📢 New Review Submitted")
                .addFields(
                    { name: "👤 User", value: interaction.user.tag, inline: true },
                    { name: "⭐ Rating", value: rating, inline: true },
                    { name: "💬 Comment", value: comment }
                )
                .setColor(0x00ff99)
                .setTimestamp();

            const channel = await client.channels.fetch(reviewChannelId);
            if (channel) {
                channel.send({ embeds: [reviewEmbed] });
            }

            await interaction.reply({ content: "✅ Thank you for your review!", ephemeral: true });
        }
    }
});

// === REMINDER SYSTEM ===
function startReminderChecker() {
    setInterval(async () => {
        const now = new Date();
        
        for (const [reminderId, reminder] of reminders.entries()) {
            if (now >= reminder.reminderDate && now <= new Date(reminder.reminderDate.getTime() + 60 * 1000)) {
                try {
                    const targetUser = await client.users.fetch(reminder.userId);
                    const authorUser = await client.users.fetch(reminder.authorId);
                    
                    const reminderEmbed = new EmbedBuilder()
                        .setTitle("🔔 Reminder Alert!")
                        .setDescription(`You have a reminder from **${authorUser.username}**`)
                        .addFields(
                            { name: "📝 Message", value: reminder.message, inline: false },
                            { name: "📅 Due Date", value: `<t:${Math.floor(reminder.dueDate.getTime() / 1000)}:F>`, inline: true },
                            { name: "⏰ Time Left", value: `<t:${Math.floor(reminder.dueDate.getTime() / 1000)}:R>`, inline: true }
                        )
                        .setColor(0xff9900)
                        .setFooter({ text: "This reminder will be automatically deleted", iconURL: client.user.displayAvatarURL() })
                        .setTimestamp();

                    await targetUser.send({ embeds: [reminderEmbed] });
                    console.log(`✅ Sent reminder to ${targetUser.tag}: ${reminder.message}`);
                    
                    reminders.delete(reminderId);
                } catch (error) {
                    console.error(`❌ Failed to send reminder ${reminderId}:`, error);
                    reminders.delete(reminderId);
                }
            } else if (now > reminder.dueDate) {
                console.log(`🗑️ Removed expired reminder: ${reminderId}`);
                reminders.delete(reminderId);
            }
        }
    }, 60 * 1000); // ✅ check every 1 minute
    console.log("🔔 Reminder checker started - checking every 1 minute");
}

// === AUTO-DELETE SYSTEM ===
const DELETE_INTERVAL_MS = 5 * 60 * 1000;

setInterval(async () => {
    const channel = await client.channels.fetch(autoDeleteChannelId).catch(() => null);
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
