const { Client, GatewayIntentBits } = require("discord.js");
require("dotenv").config();
const config = require("./config.js");
const handleEvents = require("./events.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});
const { REST, Routes } = require("discord.js");
const commands = require("./commands.js");

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
client.once("ready", async () => {
    console.log(`Bot online als ${client.user.tag}`);

    try {
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );

        console.log("Slash-Befehle wurden registriert!");
    } catch (error) {
        console.error(error);
    }
});

client.on("interactionCreate", handleEvents);
client.login(process.env.TOKEN);
const ranks = [
    "Praktikant",
    "Junior Fahrer",
    "Fahrer",
    "Erfahrener Fahrer",
    "Senior Fahrer",
    "Diamond Fahrer Azubi",
    "Diamond Fahrer",
    "Erweiterter Schutzfahrer",
    "Rechtsanwalt",
    "Leitstelle",
    "Security",
    "Security Chef",
    "Personalleitung",
    "Geschäftsleitung Airport",
    "Geschäftsleitung",
    "CEO"
];
