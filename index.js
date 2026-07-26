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

        await rest.put(

            Routes.applicationGuildCommands(
                client.user.id,
                "1457890146753183918"
            ),

            {
                body: commands
            }

        );


        console.log("Slash-Befehle wurden registriert!");


    } catch (error) {

        console.error(error);

    }

});



// Render Verbindung offen halten
http.createServer((req, res) => {

    res.write("Diamond Taxi Bot läuft!");

    res.end();

}).listen(3000);



// Events verbinden
client.on(
    "interactionCreate",
    handleEvents
);



// Bot starten
client.login(process.env.TOKEN);
