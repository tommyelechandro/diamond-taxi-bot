const { SlashCommandBuilder } = require("discord.js");

const rangAuswahl = [
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
];


const lobAuswahl = [
    {
        name: "Sehr gute Arbeit geleistet",
        value: "Sehr gute Arbeit geleistet"
    },
    {
        name: "In letzter Zeit sehr gute Entwicklung gezeigt",
        value: "In letzter Zeit sehr gute Entwicklung gezeigt"
    },
    {
        name: "Besonderes Engagement im Team gezeigt",
        value: "Besonderes Engagement im Team gezeigt"
    },
    {
        name: "Für die neue Aufgabe bereit",
        value: "Für die neue Aufgabe bereit"
    }
];


module.exports = [

    new SlashCommandBuilder()
        .setName("einstellung")
        .setDescription("Stellt einen neuen Mitarbeiter ein")
        .addUserOption(option =>
            option
                .setName("mitarbeiter")
                .setDescription("Mitarbeiter auswählen")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("rang")
                .setDescription("Start Rang")
                .setRequired(true)
                .addChoices(...rangAuswahl)
        )
        .addStringOption(option =>
            option
                .setName("grund")
                .setDescription("Grund der Einstellung")
                .setRequired(true)
        ),


    new SlashCommandBuilder()
        .setName("beförderung")
        .setDescription("Befördert einen Mitarbeiter")
        .addUserOption(option =>
            option
                .setName("mitarbeiter")
                .setDescription("Mitarbeiter auswählen")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("rang")
                .setDescription("Neuer Rang")
                .setRequired(true)
                .addChoices(...rangAuswahl)
        )
        .addStringOption(option =>
            option
                .setName("nachricht")
                .setDescription("Eigene Nachricht der Leitung")
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName("lob")
                .setDescription("Automatische Nachricht auswählen")
                .setRequired(false)
                .addChoices(...lobAuswahl)
        ),


    new SlashCommandBuilder()
        .setName("degradierung")
        .setDescription("Degradiert einen Mitarbeiter")
        .addUserOption(option =>
            option
                .setName("mitarbeiter")
                .setDescription("Mitarbeiter auswählen")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("rang")
                .setDescription("Neuer Rang")
                .setRequired(true)
                .addChoices(...rangAuswahl)
        )
        .addStringOption(option =>
            option
                .setName("grund")
                .setDescription("Grund der Degradierung")
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
        .addStringOption(option =>
            option
                .setName("grund")
                .setDescription("Grund der Kündigung")
                .setRequired(true)
        ),


    new SlashCommandBuilder()
        .setName("teamliste")
        .setDescription("Aktualisiert die Teamliste im Team-Update-Kanal manuell"),


    new SlashCommandBuilder()
        .setName("bewerbungsphase")
        .setDescription("Setzt den Live-Status der Bewerbungsphase")
        .addStringOption(option =>
            option
                .setName("status")
                .setDescription("Offen oder geschlossen")
                .setRequired(true)
                .addChoices(
                    { name: "Offen", value: "offen" },
                    { name: "Geschlossen", value: "geschlossen" }
                )
        )
        .addStringOption(option =>
            option
                .setName("nachricht")
                .setDescription("Eigene Ankündigungs-Nachricht (nur bei 'Offen')")
                .setRequired(false)
        ),


    new SlashCommandBuilder()
        .setName("geburtstag")
        .setDescription("Speichert deinen Geburtstag für die automatische Glückwunsch-Erinnerung")
        .addStringOption(option =>
            option
                .setName("datum")
                .setDescription("Dein Geburtstag im Format TT.MM, z. B. 24.12")
                .setRequired(true)
        )

];
