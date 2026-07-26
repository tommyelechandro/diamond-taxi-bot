const { SlashCommandBuilder } = require("discord.js");

module.exports = [
    new SlashCommandBuilder()
        .setName("beförderung")
    .addStringOption(option =>
    option
        .setName("rang")
        .setDescription("Neuer Rang")
        .setRequired(true)
        .addChoices(
            { name: "Praktikant", value: "Praktikant" },
            { name: "Junior Fahrer", value: "Junior Fahrer" },
            { name: "Fahrer", value: "Fahrer" },
            { name: "Erfahrener Fahrer", value: "Erfahrener Fahrer" },
            { name: "Senior Fahrer", value: "Senior Fahrer" },
            { name: "Diamond Fahrer Azubi", value: "Diamond Fahrer Azubi" },
            { name: "Diamond Fahrer", value: "Diamond Fahrer" },
            { name: "Erweiterter Schutzfahrer", value: "Erweiterter Schutzfahrer" },
            { name: "Rechtsanwalt", value: "Rechtsanwalt" },
            { name: "Leitstelle", value: "Leitstelle" },
            { name: "Security", value: "Security" },
            { name: "Security Chef", value: "Security Chef" },
            { name: "Personalleitung", value: "Personalleitung" },
            { name: "Geschäftsleitung Airport", value: "Geschäftsleitung Airport" },
            { name: "Geschäftsleitung", value: "Geschäftsleitung" },
            { name: "CEO", value: "CEO" }
        )
)
        .setDescription("Befördert einen Mitarbeiter")
        .addUserOption(option =>
            option
                .setName("mitarbeiter")
                .setDescription("Mitarbeiter auswählen")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("degradierung")
        .setDescription("Degradiert einen Mitarbeiter")
        .addUserOption(option =>
            option
                .setName("mitarbeiter")
                .setDescription("Mitarbeiter auswählen")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("kündigung")
        .setDescription("Kündigt einen Mitarbeiter")
        .addUserOption(option =>
            option
                .setName("mitarbeiter")
                .setDescription("Mitarbeiter auswählen")
                .setRequired(true)
        )
];
