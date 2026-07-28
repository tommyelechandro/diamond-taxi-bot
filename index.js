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


// Slash Commands registrieren
const rest = new REST({ version: "10" })
    .setToken(process.env.TOKEN);



client.once("ready", async () => {

    console.log(`Bot online als ${client.user.tag}`);


    try {

        // Alte GLOBALE Befehle löschen (verhindert doppelte Anzeige,
        // falls früher versehentlich global UND pro Server registriert wurde)
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: [] }
        );


        await rest.put(

            Routes.applicationGuildCommands(
                client.user.id,
                config.serverId
            ),

            {
                body: commands
            }

        );


        console.log("Slash-Befehle wurden registriert (alte globale Duplikate entfernt)!");


    } catch (error) {

        console.error(error);

    }


    // Geburtstags-Check: einmal direkt beim Start, danach alle 12 Stunden
    const geburtstagsCheck = async () => {

        const guild = client.guilds.cache.get(config.serverId);

        if (guild && handleEvents.pruefeGeburtstage) {
            await handleEvents.pruefeGeburtstage(guild);
        }
    };

    geburtstagsCheck();
    setInterval(geburtstagsCheck, 12 * 60 * 60 * 1000);

});



// Render Verbindung offen halten
http.createServer((req, res) => {

    res.write("Diamond Taxi Bot läuft!");

    res.end();

}).listen(process.env.PORT || 3000);


// Selbst-Ping alle 10 Minuten, damit Render den kostenlosen Web Service
// nicht wegen Inaktivität abschaltet (nur aktiv, wenn RENDER_EXTERNAL_URL
// gesetzt ist - das passiert automatisch auf Render, lokal nicht).
if (process.env.RENDER_EXTERNAL_URL) {

    setInterval(() => {

        fetch(process.env.RENDER_EXTERNAL_URL).catch(() => {});

    }, 10 * 60 * 1000);

}



// Events verbinden
client.on(
    "interactionCreate",
    handleEvents
);



// Bot starten
client.login(process.env.TOKEN);
