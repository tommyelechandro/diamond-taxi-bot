const { EmbedBuilder } = require("discord.js");
const config = require("./config.js");

// Schickt Fehler/Hinweise in den System-Log-Kanal (config.systemLogKanal)
async function log(guild, titel, text) {

    try {

        const id = config.systemLogKanal;
        if (!guild || !id || id === "HIER_KANAL_ID_EINTRAGEN") return;

        const kanal = await guild.channels.fetch(id);

        await kanal.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle(`⚙️ ${titel}`.slice(0, 256))
                    .setColor(0xe67e22)
                    .setDescription(String(text).slice(0, 3500))
                    .setTimestamp()
            ]
        });

    } catch (error) {
        console.error("System-Log fehlgeschlagen:", error.message);
    }
}

module.exports = { log };
