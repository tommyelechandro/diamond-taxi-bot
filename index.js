// Alle Zeiten (Lotto, Zitat, Stempeluhr, Fahrtenbuch ...) in deutscher Zeit, egal wo der Server steht
process.env.TZ = "Europe/Berlin";

const { 
    Client, 
    GatewayIntentBits, 
    REST, 
    Routes 
} = require("discord.js");

require("dotenv").config();

const config = require("./config.js");
const commands = require("./commands.js");
const handleEvents = require("./events.js");
const http = require("http");


const client = new Client({

    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]

});


const rest = new REST({ version: "10" })
    .setToken(process.env.TOKEN);



client.once("ready", async () => {

    console.log(`Bot online als ${client.user.tag}`);


    try {

        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: [] }
        );

        await rest.put(
            Routes.applicationGuildCommands(
                client.user.id,
                config.serverId
            ),
            { body: commands }
        );

        console.log("Slash-Befehle wurden registriert (alte globale Duplikate entfernt)!");

    } catch (error) {
        console.error(error);
    }


    // Fahrtenbuch aus dem Logs-Kanal in den Speicher laden
    try {
        const fahrtenGuild = client.guilds.cache.get(config.serverId);
        if (fahrtenGuild && handleEvents.ladeFahrtenbuch) {
            handleEvents.ladeFahrtenbuch(fahrtenGuild).catch(error => {
                console.error("Fahrtenbuch konnte nicht geladen werden:", error.message);
            });
        }
    } catch (error) {
        console.error("Fahrtenbuch-Start fehlgeschlagen:", error.message);
    }


    // Geburtstags-Check: einmal beim Start, danach alle 12 Stunden
    const geburtstagsCheck = async () => {
        const guild = client.guilds.cache.get(config.serverId);
        if (guild && handleEvents.pruefeGeburtstage) {
            await handleEvents.pruefeGeburtstage(guild);
        }
    };

    geburtstagsCheck();
    setInterval(geburtstagsCheck, 12 * 60 * 60 * 1000);


    // Alle 15 Minuten: Tages-Zitat (9 Uhr), Sanktions-Erinnerungen, Wochen-Auswertungen,
    // Abmeldeliste bereinigen. Interne Marker verhindern Doppel-Ausführung.
    const periodischerCheck = async () => {

        const guild = client.guilds.cache.get(config.serverId);
        if (!guild) return;

        const jetzt = new Date();
        const wochentag = jetzt.getDay(); // 0 = Sonntag, 3 = Mittwoch
        const stunde = jetzt.getHours();

        try {
            if (handleEvents.bereinigeAbmeldungen) {
                await handleEvents.bereinigeAbmeldungen(guild);
            }
        } catch (error) {
            console.error("Abmeldeliste-Check fehlgeschlagen:", error.message);
        }

        try {
            if (handleEvents.sendeSanktionsErinnerungen) {
                await handleEvents.sendeSanktionsErinnerungen(guild);
            }
        } catch (error) {
            console.error("Sanktions-Erinnerung fehlgeschlagen:", error.message);
        }

        try {
            if (stunde === 9 && handleEvents.posteTagesZitat) {
                await handleEvents.posteTagesZitat(guild);
            }
        } catch (error) {
            console.error("Zitat-Check fehlgeschlagen:", error.message);
        }

        try {
            // täglich 18 Uhr: Nachtschicht-Auswertung
            if (stunde === 18 && handleEvents.posteNachtstunden) {
                await handleEvents.posteNachtstunden(guild);
            }

            // nur sonntags 20 Uhr: Top 5 der Woche inkl. Sonderzahlung
            if (wochentag === 0 && stunde === 20) {
                if (handleEvents.posteWochenStunden) await handleEvents.posteWochenStunden(guild);
                if (handleEvents.posteFahrerDerWoche) await handleEvents.posteFahrerDerWoche(guild);
                if (handleEvents.posteWochenbericht) await handleEvents.posteWochenbericht(guild);
            }
        } catch (error) {
            console.error("Stempeluhr-Check fehlgeschlagen:", error.message);
        }

        try {
            // nur sonntags 15 Uhr: Fahrtenbuch-Rechnung (offene Beträge)
            if (wochentag === 0 && stunde === 15 && handleEvents.posteFahrtenRechnung) {
                await handleEvents.posteFahrtenRechnung(guild);
            }
        } catch (error) {
            console.error("Fahrtenbuch-Rechnung fehlgeschlagen:", error.message);
        }
    };

    periodischerCheck();
    setInterval(periodischerCheck, 15 * 60 * 1000);


    // Alle 5 Minuten: Erinnerungen für Bewerbungsgespräche (30 Min vorher)
    const gespraechsCheck = async () => {
        const guild = client.guilds.cache.get(config.serverId);
        if (guild && handleEvents.pruefeGespraechsErinnerungen) {
            await handleEvents.pruefeGespraechsErinnerungen(guild);
        }
    };

    gespraechsCheck();
    setInterval(gespraechsCheck, 5 * 60 * 1000);

});



// Render Verbindung offen halten
http.createServer((req, res) => {

    res.write("Diamond Taxi Bot läuft!");

    res.end();

}).listen(process.env.PORT || 3000);


// Selbst-Ping alle 10 Minuten, damit Render den kostenlosen Web Service
// nicht wegen Inaktivität abschaltet.
if (process.env.RENDER_EXTERNAL_URL) {

    setInterval(() => {

        fetch(process.env.RENDER_EXTERNAL_URL).catch(() => {});

    }, 10 * 60 * 1000);

}



client.on(
    "interactionCreate",
    handleEvents
);


// Anti-Bot-Kanal + Ausweis-Bilder in Bewerbungs-Tickets
client.on("messageCreate", async (message) => {

    try {
        await handleEvents.handleNachricht(message);
    } catch (error) {
        console.error("Nachrichten-Handler fehlgeschlagen:", error.message);
    }

});



client.login(process.env.TOKEN);
