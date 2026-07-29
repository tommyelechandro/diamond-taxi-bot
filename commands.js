const { SlashCommandBuilder } = require("discord.js");
const config = require("./config.js");

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


// Sanktions-Auswahl wird aus der Liste in config.js gebaut,
// damit Text/Beträge nur an EINER Stelle gepflegt werden müssen.
const sanktionsAuswahl = config.sanktionen.map(s => ({
    label: `§${s.paragraph} – ${s.text}`.slice(0, 100),
    description: `${s.betrag.toLocaleString("de-DE")} $`,
    value: String(s.paragraph)
}));


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
                .setName("wiederoeffnung")
                .setDescription("Datum der Wiedereröffnung TT.MM.JJJJ (nur bei 'Geschlossen', zeigt Live-Countdown)")
                .setRequired(false)
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
        ),


    new SlashCommandBuilder()
        .setName("ankündigung")
        .setDescription("Postet eine Ankündigung im Ankündigungs-Kanal")
        .addStringOption(option =>
            option
                .setName("text")
                .setDescription("Der Text der Ankündigung")
                .setRequired(true)
        ),


    new SlashCommandBuilder()
        .setName("teambesprechung")
        .setDescription("Kündigt eine Teambesprechung an und informiert alle Mitarbeiter per DM")
        .addStringOption(option =>
            option
                .setName("datum")
                .setDescription("Datum der Besprechung, z. B. 30.07.2026")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("ort")
                .setDescription("Ort / Kanal der Besprechung")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("uhrzeit")
                .setDescription("Uhrzeit, z. B. 18:00")
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName("info")
                .setDescription("Zusätzliche Informationen")
                .setRequired(false)
        ),


    new SlashCommandBuilder()
        .setName("sanktion")
        .setDescription("Sanktionen verwalten")
        .addSubcommand(sub =>
            sub
                .setName("ausstellen")
                .setDescription("Stellt eine neue Sanktion aus (mehrere Gründe möglich)")
                .addUserOption(option =>
                    option
                        .setName("mitarbeiter")
                        .setDescription("Betroffener Mitarbeiter")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("frist")
                        .setDescription("Zahlungsfrist im Format TT.MM.JJJJ")
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("bezahlt")
                .setDescription("Markiert offene Sanktionen eines Mitarbeiters als bezahlt")
                .addUserOption(option =>
                    option
                        .setName("mitarbeiter")
                        .setDescription("Mitarbeiter")
                        .setRequired(true)
                )
        )

];
