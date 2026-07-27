const { 
    Client, 
    GatewayIntentBits, 
    REST, 
    Routes 
} = require("discord.js");

require("dotenv").config();

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

        // WICHTIG: Zuerst alle GLOBALEN Befehle löschen. Falls die Befehle
        // früher mal global registriert wurden (Routes.applicationCommands)
        // UND jetzt zusätzlich pro Server registriert werden, zeigt Discord
        // beide Versionen gleichzeitig an -> das war die Ursache für die
        // doppelt angezeigten Befehle. Ein leeres Array zu setzen ist
        // ungefährlich und kann bei jedem Start stehen bleiben.
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: [] }
        );


        await rest.put(

            Routes.applicationGuildCommands(
                client.user.id,
                "1457890146753183918"
            ),

            {
                body: commands
            }

        );


        console.log("Slash-Befehle wurden registriert (alte globale Duplikate entfernt)!");


    } catch (error) {

        console.error(error);

    }

});



// Render Verbindung offen halten
http.createServer((req, res) => {

    res.write("Diamond Taxi Bot läuft!");

    res.end();

}).listen(process.env.PORT || 3000);


// Selbst-Ping alle 10 Minuten, damit Render den kostenlosen Web Service
// nicht wegen Inaktivität abschaltet (nur aktiv, wenn RENDER_EXTERNAL_URL
// gesetzt ist - das passiert automatisch auf Render, lokal nicht).
// Empfehlung zusätzlich: einen kostenlosen externen Monitor wie
// UptimeRobot oder cron-job.org auf dieselbe URL einrichten - das ist
// zuverlässiger, da Render selbst keinen offiziellen Weg dafür anbietet.
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
