const { SlashCommandBuilder } = require("discord.js");
const config = require("./config.js");

const rangAuswahl = [
    { name: "Praktikant", value: "Praktikant" },
    { name: "Azubi", value: "Azubi" },
    { name: "Diplomfahrer", value: "Diplomfahrer" },
    { name: "Taxi Fahrer", value: "Taxi Fahrer" },
    { name: "Diamond Fahrer", value: "Diamond Fahrer" },
    { name: "Senior Fahrer", value: "Senior Fahrer" },
    { name: "Elite Fahrer", value: "Elite Fahrer" },
    { name: "Ausbilder", value: "Ausbilder" },
    { name: "Ausbildungsleitung", value: "Ausbildungsleitung" },
    { name: "Personalleitung", value: "Personalleitung" },
    { name: "Geschäftsleitung", value: "Geschäftsleitung" },
    { name: "CEO", value: "CEO" }
];


const lobAuswahl = [
    { name: "Sehr gute Arbeit geleistet", value: "Sehr gute Arbeit geleistet" },
    { name: "In letzter Zeit sehr gute Entwicklung gezeigt", value: "In letzter Zeit sehr gute Entwicklung gezeigt" },
    { name: "Besonderes Engagement im Team gezeigt", value: "Besonderes Engagement im Team gezeigt" },
    { name: "Für die neue Aufgabe bereit", value: "Für die neue Aufgabe bereit" }
];


module.exports = [

    new SlashCommandBuilder()
        .setName("einstellung")
        .setDescription("Stellt einen neuen Mitarbeiter ein")
        .addUserOption(option =>
            option.setName("mitarbeiter").setDescription("Mitarbeiter auswählen").setRequired(true)
        )
        .addStringOption(option =>
            option.setName("rang").setDescription("Start Rang").setRequired(true).addChoices(...rangAuswahl)
        )
        .addStringOption(option =>
            option.setName("grund").setDescription("Grund der Einstellung").setRequired(true)
        ),


    new SlashCommandBuilder()
        .setName("beförderung")
        .setDescription("Befördert einen Mitarbeiter")
        .addUserOption(option =>
            option.setName("mitarbeiter").setDescription("Mitarbeiter auswählen").setRequired(true)
        )
        .addStringOption(option =>
            option.setName("rang").setDescription("Neuer Rang").setRequired(true).addChoices(...rangAuswahl)
        )
        .addStringOption(option =>
            option.setName("nachricht").setDescription("Eigene Nachricht der Leitung").setRequired(false)
        )
        .addStringOption(option =>
            option.setName("lob").setDescription("Automatische Nachricht auswählen").setRequired(false).addChoices(...lobAuswahl)
        ),


    new SlashCommandBuilder()
        .setName("degradierung")
        .setDescription("Degradiert einen Mitarbeiter")
        .addUserOption(option =>
            option.setName("mitarbeiter").setDescription("Mitarbeiter auswählen").setRequired(true)
        )
        .addStringOption(option =>
            option.setName("rang").setDescription("Neuer Rang").setRequired(true).addChoices(...rangAuswahl)
        )
        .addStringOption(option =>
            option.setName("grund").setDescription("Grund der Degradierung").setRequired(true)
        ),


    new SlashCommandBuilder()
        .setName("kündigung")
        .setDescription("Kündigt einen Mitarbeiter")
        .addUserOption(option =>
            option.setName("mitarbeiter").setDescription("Mitarbeiter auswählen").setRequired(true)
        )
        .addStringOption(option =>
            option.setName("grund").setDescription("Grund der Kündigung").setRequired(true)
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
                .setName("naechste_schliessung")
                .setDescription("Datum, wann wieder geschlossen wird TT.MM.JJJJ (nur bei 'Offen', zeigt Live-Countdown)")
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
            option.setName("datum").setDescription("Dein Geburtstag im Format TT.MM, z. B. 24.12").setRequired(true)
        ),


    new SlashCommandBuilder()
        .setName("ankündigung")
        .setDescription("Postet eine Ankündigung im Ankündigungs-Kanal (pingt alle Bürger)")
        .addStringOption(option =>
            option.setName("text").setDescription("Der Text der Ankündigung").setRequired(true)
        ),


    new SlashCommandBuilder()
        .setName("teambesprechung")
        .setDescription("Kündigt eine Teambesprechung an (pingt alle Bürger + DM an Mitarbeiter)")
        .addStringOption(option =>
            option.setName("datum").setDescription("Datum der Besprechung, z. B. 30.07.2026").setRequired(true)
        )
        .addStringOption(option =>
            option.setName("ort").setDescription("Ort / Kanal der Besprechung").setRequired(true)
        )
        .addStringOption(option =>
            option.setName("uhrzeit").setDescription("Uhrzeit, z. B. 18:00").setRequired(false)
        )
        .addStringOption(option =>
            option.setName("info").setDescription("Zusätzliche Informationen").setRequired(false)
        ),


    new SlashCommandBuilder()
        .setName("abmeldung")
        .setDescription("Meldest dich für einen Zeitraum ab (erscheint live in der Abmeldeliste)")
        .addStringOption(option =>
            option.setName("von").setDescription("Ab wann, Format TT.MM.JJJJ").setRequired(true)
        )
        .addStringOption(option =>
            option.setName("bis").setDescription("Bis wann, Format TT.MM.JJJJ").setRequired(true)
        )
        .addStringOption(option =>
            option.setName("grund").setDescription("Grund der Abmeldung").setRequired(true)
        ),


    new SlashCommandBuilder()
        .setName("gespräch")
        .setDescription("Trägt ein Bewerbungsgespräch ein und informiert beide Seiten per DM")
        .addStringOption(option =>
            option.setName("datum").setDescription("Datum, Format TT.MM.JJJJ").setRequired(true)
        )
        .addStringOption(option =>
            option.setName("uhrzeit").setDescription("Uhrzeit, Format HH:MM").setRequired(true)
        )
        .addStringOption(option =>
            option.setName("ort").setDescription("Ort des Gesprächs").setRequired(true)
        )
        .addUserOption(option =>
            option.setName("bewerber").setDescription("Der Bewerber (im Bewerbungs-Ticket nicht nötig)").setRequired(false)
        ),


    new SlashCommandBuilder()
        .setName("sanktion")
        .setDescription("Sanktionen & Strikes verwalten")
        .addSubcommand(sub =>
            sub
                .setName("ausstellen")
                .setDescription("Stellt eine Sanktion aus (mehrere Verstöße, Strikes, eigene Sanktion möglich)")
                .addUserOption(option =>
                    option.setName("mitarbeiter").setDescription("Betroffener Mitarbeiter").setRequired(true)
                )
                .addStringOption(option =>
                    option.setName("frist").setDescription("Zahlungsfrist TT.MM.JJJJ (leer = 7 Tage)").setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("bezahlt")
                .setDescription("Markiert offene Sanktionen eines Mitarbeiters als bezahlt")
                .addUserOption(option =>
                    option.setName("mitarbeiter").setDescription("Mitarbeiter").setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("strikes")
                .setDescription("Zeigt die aktiven Strikes eines Mitarbeiters")
                .addUserOption(option =>
                    option.setName("mitarbeiter").setDescription("Mitarbeiter").setRequired(true)
                )
        ),


    new SlashCommandBuilder()
        .setName("fahrtenbuch")
        .setDescription("Fahrtenbuch verwalten (nur Leitungsebene)")
        .addSubcommand(sub =>
            sub
                .setName("senden")
                .setDescription("Sendet das Fahrtenbuch-Panel mit den Buttons in den Fahrtenbuch-Kanal")
        )
        .addSubcommand(sub =>
            sub
                .setName("bezahlt")
                .setDescription("Markiert Fahrten eines Mitarbeiters als bezahlt")
                .addUserOption(option =>
                    option.setName("mitarbeiter").setDescription("Mitarbeiter").setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("modus")
                        .setDescription("Alles auf einmal oder einzelne Fahrten auswählen (Standard: alles)")
                        .setRequired(false)
                        .addChoices(
                            { name: "Alles bezahlt", value: "alles" },
                            { name: "Manuell auswählen", value: "auswahl" }
                        )
                )
        ),


    new SlashCommandBuilder()
        .setName("ticket")
        .setDescription("Sendet das Ticket-Panel in diesen Kanal (nur Leitungsebene)")
        .addSubcommand(sub => sub.setName("senden").setDescription("Ticket-Panel mit Auswahlmenü senden")),


    new SlashCommandBuilder()
        .setName("bewerbung")
        .setDescription("Sendet das Bewerbungs-Panel in diesen Kanal (nur Leitungsebene)")
        .addSubcommand(sub => sub.setName("senden").setDescription("Bewerbungs-Panel mit Button senden")),


    new SlashCommandBuilder()
        .setName("antibot")
        .setDescription("Anti-Bot-Kanal (nur Leitungsebene)")
        .addSubcommand(sub => sub.setName("senden").setDescription("Warn-Nachricht in den Anti-Bot-Kanal senden"))

];
