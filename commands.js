const { SlashCommandBuilder } = require("discord.js");

module.exports = [
    new SlashCommandBuilder()
        .setName("beförderung")
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
