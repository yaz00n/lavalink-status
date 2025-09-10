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

// 🛒 Order Ticket Setup
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    // Command prefix
    const prefix = "!";
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // 📦 Setup Order Command
    if (command === "setuporder") {
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

    // 📊 Server Info Command
    if (command === "serverinfo") {
        const guild = message.guild;
        if (!guild) return message.reply("❌ This command can only be used in a server!");

        const embed = new EmbedBuilder()
            .setTitle(`📊 ${guild.name} Server Information`)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .setColor(0x2b2d31)
            .addFields(
                { name: "👑 Owner", value: `<@${guild.ownerId}>`, inline: true },
                { name: "👥 Members", value: `${guild.memberCount}`, inline: true },
                { name: "📅 Created", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true },
                { name: "🌍 Region", value: guild.preferredLocale || "Unknown", inline: true },
                { name: "🛡️ Verification Level", value: guild.verificationLevel.toString(), inline: true },
                { name: "📝 Channels", value: `${guild.channels.cache.size}`, inline: true },
                { name: "😀 Emojis", value: `${guild.emojis.cache.size}`, inline: true },
                { name: "🎭 Roles", value: `${guild.roles.cache.size}`, inline: true },
                { name: "🆔 Server ID", value: guild.id, inline: true }
            )
            .setFooter({ text: "Server Information", iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }

    // 👤 User Info Command
    if (command === "userinfo") {
        const target = message.mentions.users.first() || message.author;
        const member = message.guild.members.cache.get(target.id);

        const embed = new EmbedBuilder()
            .setTitle(`👤 ${target.username} User Information`)
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .setColor(0x2b2d31)
            .addFields(
                { name: "👤 Username", value: target.username, inline: true },
                { name: "🏷️ Display Name", value: target.displayName || "None", inline: true },
                { name: "🆔 User ID", value: target.id, inline: true },
                { name: "📅 Account Created", value: `<t:${Math.floor(target.createdTimestamp / 1000)}:F>`, inline: false },
                { name: "📥 Joined Server", value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` : "Not in server", inline: false },
                { name: "🎭 Roles", value: member ? member.roles.cache.filter(r => r.name !== "@everyone").map(r => r.name).join(", ") || "None" : "Not in server", inline: false }
            )
            .setFooter({ text: "User Information", iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }

    // 🔔 Reminder Command
    if (command === "remind" || command === "reminder") {
        if (!args.length) {
            return message.reply("❌ **Usage:** `!remind <@user> <days> <reminder message>`\n**Example:** `!remind @john 7 Complete the project`");
        }

        const targetUser = message.mentions.users.first();
        if (!targetUser) {
            return message.reply("❌ Please mention a user to remind!");
        }

        const days = parseInt(args[1]);
        if (isNaN(days) || days < 1) {
            return message.reply("❌ Please provide a valid number of days (minimum 1)!");
        }

        const reminderMessage = args.slice(2).join(" ");
        if (!reminderMessage) {
            return message.reply("❌ Please provide a reminder message!");
        }

        // Calculate reminder date (1 day before the due date)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + days);
        
        const reminderDate = new Date(dueDate);
        reminderDate.setDate(reminderDate.getDate() - 1);

        // Store reminder
        const reminderId = `${Date.now()}_${Math.random()}`;
        reminders.set(reminderId, {
            userId: targetUser.id,
            authorId: message.author.id,
            message: reminderMessage,
            dueDate: dueDate,
            reminderDate: reminderDate,
            guildId: message.guild.id,
            channelId: message.channel.id
        });

        const embed = new EmbedBuilder()
            .setTitle("🔔 Reminder Set!")
            .setDescription(`✅ Reminder has been set for ${targetUser}`)
            .addFields(
                { name: "📝 Message", value: reminderMessage, inline: false },
                { name: "📅 Due Date", value: `<t:${Math.floor(dueDate.getTime() / 1000)}:F>`, inline: true },
                { name: "⏰ Reminder Date", value: `<t:${Math.floor(reminderDate.getTime() / 1000)}:F>`, inline: true }
            )
            .setColor(0x00ff00)
            .setFooter({ text: "They will be reminded 1 day before the due date", iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        await message.reply({ embeds: [embed] });

        console.log(`📝 Reminder set: ${reminderId} for ${targetUser.tag}`);
    }

    // 📋 List Reminders Command
    if (command === "reminders") {
        const userReminders = Array.from(reminders.entries())
            .filter(([_, reminder]) => reminder.userId === message.author.id || reminder.authorId === message.author.id)
            .slice(0, 10); // Limit to 10 reminders

        if (userReminders.length === 0) {
            return message.reply("📭 You have no active reminders!");
        }

        const embed = new EmbedBuilder()
            .setTitle("📋 Your Active Reminders")
            .setColor(0x2b2d31)
            .setFooter({ text: `Total: ${userReminders.length} reminders`, iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        userReminders.forEach(([id, reminder], index) => {
            const targetUser = client.users.cache.get(reminder.userId);
            const isOwner = reminder.authorId === message.author.id;
            
            embed.addFields({
                name: `${index + 1}. ${isOwner ? 'For' : 'From'} ${targetUser ? targetUser.username : 'Unknown User'}`,
                value: `📝 **Message:** ${reminder.message}\n📅 **Due:** <t:${Math.floor(reminder.dueDate.getTime() / 1000)}:R>\n⏰ **Reminder:** <t:${Math.floor(reminder.reminderDate.getTime() / 1000)}:R>`,
                inline: false
            });
        });

        await message.reply({ embeds: [embed] });
    }

    // 🛠️ Help Command
    if (command === "help") {
        const embed = new EmbedBuilder()
            .setTitle("📚 Bot Commands Help")
            .setDescription("Here are all available commands:")
            .setColor(0x2b2d31)
            .addFields(
                { name: "📦 Order System", value: "`!setuporder` - Setup the order ticket system", inline: false },
                { name: "📊 Information", value: "`!serverinfo` - Show server information\n`!userinfo [@user]` - Show user information", inline: false },
                { name: "🔔 Reminders", value: "`!remind <@user> <days> <message>` - Set a reminder\n`!reminders` - View your active reminders", inline: false },
                { name: "🛠️ Utility", value: "`!help` - Show this help menu", inline: false }
            )
            .setFooter({ text: "Use ! as prefix for all commands", iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
});

// 🎯 Interaction Handler
client.on(Events.InteractionCreate, async (interaction) => {
    const user = interaction.user;
    const guild = interaction.guild;

    // Handle Modal Submission
    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'review_modal') {
            const rating = parseInt(interaction.fields.getTextInputValue('rating_input'));
            const reviewMessage = interaction.fields.getTextInputValue('review_input');

            // Validate rating
            if (isNaN(rating) || rating < 1 || rating > 5) {
                return await interaction.reply({
                    content: "❌ Please provide a rating between 1-5!",
                    ephemeral: true
                });
            }

            // Generate stars display
            const fullStars = "⭐".repeat(rating);
            const emptyStars = "☆".repeat(5 - rating);
            const starsDisplay = fullStars + emptyStars;

            // Generate review ID
            const reviewId = Math.random().toString(36).substr(2, 9);

            const reviewEmbed = new EmbedBuilder()
                .setAuthor({ 
                    name: "New Review! 📢", 
                    iconURL: client.user.displayAvatarURL() 
                })
                .setDescription(`**${user.username}** • new review\n\n${reviewMessage}`)
                .addFields(
                    { name: "Rating", value: starsDisplay, inline: true },
                    { name: "Reviewed", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
                )
                .setColor(0x5865f2)
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setFooter({ 
                    text: `⭐ ReviewHub • Review ID: ${reviewId}`, 
                    iconURL: client.user.displayAvatarURL()
                })
                .setTimestamp();

            // Action buttons
            const actionRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`report_${reviewId}`)
                    .setLabel("Report")
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`submit_review_modal`)
                    .setLabel("📝 Submit A Review")
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`useful_${reviewId}`)
                    .setLabel("👍 Useful")
                    .setStyle(ButtonStyle.Secondary)
            );

            // Reaction row with heart and refresh
            const reactionRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`heart_${reviewId}`)
                    .setLabel("❤️ 1")
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`refresh_${reviewId}`)
                    .setLabel("🔄")
                    .setStyle(ButtonStyle.Secondary)
            );

            await interaction.reply({ 
                embeds: [reviewEmbed], 
                components: [actionRow, reactionRow] 
            });

            // Owner's Response section (initially empty)
            const ownerResponseEmbed = new EmbedBuilder()
                .setDescription(`**Owner's Response** 1 Message >\nThere are no recent messages in this thread.`)
                .setColor(0x2b2d31);

            await interaction.followUp({ embeds: [ownerResponseEmbed] });

            return;
        }
    }

    if (!interaction.isButton()) return;

    // Handle Submit Review Modal Button
    if (interaction.customId === 'submit_review_modal') {
        const modal = new ModalBuilder()
            .setCustomId('review_modal')
            .setTitle('⭐ Submit Your Review');

        const ratingInput = new TextInputBuilder()
            .setCustomId('rating_input')
            .setLabel('What rating would you like to give? (1-5) *')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter a number from 1 to 5')
            .setRequired(true)
            .setMaxLength(1)
            .setMinLength(1);

        const reviewInput = new TextInputBuilder()
            .setCustomId('review_input')
            .setLabel('Description of your review *')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Tell us about your experience...')
            .setRequired(true)
            .setMaxLength(1000);

        // Warning text would be added by Discord automatically
        const firstActionRow = new ActionRowBuilder().addComponents(ratingInput);
        const secondActionRow = new ActionRowBuilder().addComponents(reviewInput);

        modal.addComponents(firstActionRow, secondActionRow);

        await interaction.showModal(modal);
        return;
    }

    // Handle review button interactions
    if (interaction.customId.startsWith('report_') || 
        interaction.customId.startsWith('useful_') ||
        interaction.customId.startsWith('heart_') ||
        interaction.customId.startsWith('refresh_')) {
        
        const reviewId = interaction.customId.split('_')[1];
        
        if (interaction.customId.startsWith('report_')) {
            await interaction.reply({ 
                content: "🚨 Thank you for reporting this review. Our moderation team will review it.", 
                ephemeral: true 
            });
        }
        else if (interaction.customId.startsWith('useful_')) {
            await interaction.reply({ 
                content: "👍 Thank you for marking this review as useful!", 
                ephemeral: true 
            });
        }
        else if (interaction.customId.startsWith('heart_')) {
            // Toggle heart reaction (simplified - in production you'd track this)
            const currentLabel = interaction.message.components[1].components[0].data.label;
            const currentCount = parseInt(currentLabel.match(/\d+/)[0]);
            const newCount = currentCount + 1;
            
            const newButton = ButtonBuilder.from(interaction.message.components[1].components[0].data)
                .setLabel(`❤️ ${newCount}`);
            
            const newRow = new ActionRowBuilder().addComponents(
                newButton,
                ButtonBuilder.from(interaction.message.components[1].components[1].data)
            );
            
            const actionRow = ActionRowBuilder.from(interaction.message.components[0]);
            
            await interaction.update({ 
                components: [actionRow, newRow] 
            });
        }
        else if (interaction.customId.startsWith('refresh_')) {
            await interaction.reply({ 
                content: "🔄 Review refreshed!", 
                ephemeral: true 
            });
        }
        
        return;
    }

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

4 - What would you like your bot's profile picture to be?

5 - What would like your bot's status to be? (Ex: Playing: NewGen Studio)*

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

// 🔔 Reminder System
function startReminderChecker() {
    // Check for reminders every 30 minutes
    setInterval(async () => {
        const now = new Date();
        
        for (const [reminderId, reminder] of reminders.entries()) {
            // Check if it's time to send the reminder (within 30 minutes of reminder time)
            if (now >= reminder.reminderDate && now <= new Date(reminder.reminderDate.getTime() + 30 * 60 * 1000)) {
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
                    
                    // Remove the reminder after sending
                    reminders.delete(reminderId);
                    
                } catch (error) {
                    console.error(`❌ Failed to send reminder ${reminderId}:`, error);
                    // Remove failed reminder
                    reminders.delete(reminderId);
                }
            }
            // Remove expired reminders (past due date)
            else if (now > reminder.dueDate) {
                console.log(`🗑️ Removed expired reminder: ${reminderId}`);
                reminders.delete(reminderId);
            }
        }
    }, 30 * 60 * 1000); // Check every 30 minutes

    console.log("🔔 Reminder checker started - checking every 30 minutes");
}

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
