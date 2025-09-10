const { REST, Routes, SlashCommandBuilder } = require("discord.js");
const { token } = require("./config");
const dotenv = require("dotenv");
dotenv.config();

const CLIENT_ID = "YOUR_CLIENT_ID"; // Replace with your bot's client ID
const GUILD_ID = "YOUR_GUILD_ID";   // Replace with your target guild ID

const commands = [
    new SlashCommandBuilder()
        .setName("review")
        .setDescription("Submit a review for a developer.")
        .toJSON()
];

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
    try {
        console.log("🔄 Deploying slash commands...");
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
        console.log("✅ Slash commands deployed successfully.");
    } catch (error) {
        console.error("❌ Failed to deploy commands:", error);
    }
})();
