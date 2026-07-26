const { EmbedBuilder } = require("discord.js");
const config = require("./config.js");

module.exports = async (interaction) => {

    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "beförderung") {

        const user = interaction.options.getMember("mitarbeiter");
        const neuerRang = interaction.options.getString("rang");

        const neueRolle = interaction.guild.roles.cache.get(
            config.rollen[neuerRang]
        );

        if (!neueRolle) {
            return interaction.reply({
                content: "❌ Rolle wurde nicht gefunden.",
                ephemeral: true
            });
        }

        // Alte Rangrollen entfernen
        for (const rolle of Object.values(config.rollen)) {
            if (user.roles.cache.has(rolle)) {
                await user.roles.remove(rolle);
            }
        }

        // Neue Rangrolle geben
        await user.roles.add(neueRolle);

        // Mitarbeiterrolle geben
        await user.roles.add(config.mitarbeiterRolle);

        // Leitungsebene prüfen
        if (config.leitungsebene.includes(config.rollen[neuerRang])) {
            await user.roles.add(config.leitungRolle);
        }

        const embed = new EmbedBuilder()
            .setTitle("🚕💎 Beförderung")
            .setDescription(
                `Herzlichen Glückwunsch <@${user.id}>!\n\n` +
                `Du wurdest zum **${neuerRang}** befördert.`
            )
            .setTimestamp();

        await interaction.reply({
            embeds: [embed]
        });
    }
};
