const { Client, GatewayIntentBits } = require("discord.js");
require("dotenv").config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

client.once("ready", () => {
    console.log(`Bot online als ${client.user.tag}`);
});

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
