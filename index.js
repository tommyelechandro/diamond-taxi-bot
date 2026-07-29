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
        GatewayIntentBits.GuildMembers
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


    // Geburtstags-Check: einmal beim Start, danach alle 12 Stunden
    const geburtstagsCheck = async () => {
        const guild = client.guilds.cache.get(config.serverId);
        if (guild && handleEvents.pruefeGeburtstage) {
            await handleEvents.pruefeGeburtstage(guild);
        }
    };

    geburtstagsCheck();
    setInterval(geburtstagsCheck, 12 * 60 * 60 * 1000);


    // Alle 15 Minuten: Lotto-Ziehung (Mi/So 20 Uhr), Tages-Zitat (9 Uhr),
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
            if ((wochentag === 0 || wochentag === 3) && stunde === 20 && handleEvents.ziehungDurchfuehren) {
                await handleEvents.ziehungDurchfuehren(guild);
            }
        } catch (error) {
            console.error("Lotto-Check fehlgeschlagen:", error.message);
        }

        try {
            if (stunde === 9 && handleEvents.posteTagesZitat) {
                await handleEvents.posteTagesZitat(guild);
            }
        } catch (error) {
            console.error("Zitat-Check fehlgeschlagen:", error.message);
        }
    };

    periodischerCheck();
    setInterval(periodischerCheck, 15 * 60 * 1000);

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



client.login(process.env.TOKEN);
