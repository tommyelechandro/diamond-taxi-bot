const { EmbedBuilder } = require("discord.js");
const config = require("./config.js");

module.exports = async (interaction) => {

    if (!interaction.isChatInputCommand()) return;

    try {

        const user = interaction.options.getMember("mitarbeiter");


        async function entferneRang(user) {
            for (const rolleID of Object.values(config.rollen)) {

                const rolle = interaction.guild.roles.cache.get(rolleID);

                if (rolle && user.roles.cache.has(rolleID)) {
                    await user.roles.remove(rolle);
                }
            }
        }


        async function gebeRang(user, rang) {

            const rollenID = config.rollen[rang];

            if (!rollenID) {
                throw new Error(`Rang existiert nicht in config.js: ${rang}`);
            }


            const rolle = interaction.guild.roles.cache.get(rollenID);


            if (!rolle) {
                throw new Error(`Discord Rolle nicht gefunden: ${rang}`);
            }


            await user.roles.add(rolle);


            // Mitarbeiter Rolle
            const mitarbeiter = interaction.guild.roles.cache.get(
                config.mitarbeiterRolle
            );

            if (mitarbeiter) {
                await user.roles.add(mitarbeiter);
            }


            // Leitungsebene
            if (config.leitungsebene.includes(rollenID)) {

                const leitung = interaction.guild.roles.cache.get(
                    config.leitungRolle
                );

                if (leitung) {
                    await user.roles.add(leitung);
                }

            } else {

                const leitung = interaction.guild.roles.cache.get(
                    config.leitungRolle
                );

                if (leitung && user.roles.cache.has(config.leitungRolle)) {
                    await user.roles.remove(leitung);
                }

            }
        }



        // ======================
        // EINSTELLUNG
        // ======================

        if (interaction.commandName === "einstellung") {

            const rang = interaction.options.getString("rang");
            const grund = interaction.options.getString("grund");


            await gebeRang(user, rang);


            const embed = new EmbedBuilder()
                .setTitle("🚕💎 Einstellung")
                .setDescription(
                    `Herzlich willkommen <@${user.id}>!\n\n` +
                    `Du wurdest als **${rang}** eingestellt.\n\n` +
                    `**Grund:** ${grund}\n\n` +
                    `Wir wünschen dir viel Erfolg bei Diamond Taxi!`
                )
                .setTimestamp();


            return interaction.reply({
                embeds: [embed]
            });
        }



        // ======================
        // BEFÖRDERUNG
        // ======================

        if (interaction.commandName === "beförderung") {

            const rang = interaction.options.getString("rang");
            const nachricht = interaction.options.getString("nachricht");
            const lob = interaction.options.getString("lob");


            await entferneRang(user);

            await gebeRang(user, rang);


            const text =
                nachricht ||
                lob ||
                "Wir wünschen dir weiterhin viel Erfolg bei Diamond Taxi!";


            const embed = new EmbedBuilder()
                .setTitle("🚕💎 Beförderung")
                .setDescription(
                    `Herzlichen Glückwunsch <@${user.id}>!\n\n` +
                    `Du wurdest zum **${rang}** befördert.\n\n` +
                    `**Nachricht der Leitung:**\n${text}`
                )
                .setTimestamp();


            return interaction.reply({
                embeds: [embed]
            });
        }



        // ======================
        // DEGRADIERUNG
        // ======================

        if (interaction.commandName === "degradierung") {

            const rang = interaction.options.getString("rang");
            const grund = interaction.options.getString("grund");


            await entferneRang(user);

            await gebeRang(user, rang);


            const embed = new EmbedBuilder()
                .setTitle("⚠️ Degradierung")
                .setDescription(
                    `<@${user.id}> wurde auf **${rang}** gesetzt.\n\n` +
                    `**Grund:** ${grund}`
                )
                .setTimestamp();


            return interaction.reply({
                embeds: [embed]
            });
        }



        // ======================
        // KÜNDIGUNG
        // ======================

        if (interaction.commandName === "kündigung") {

            const grund = interaction.options.getString("grund");


            await entferneRang(user);


            const mitarbeiter = interaction.guild.roles.cache.get(
                config.mitarbeiterRolle
            );

            if (mitarbeiter && user.roles.cache.has(config.mitarbeiterRolle)) {
                await user.roles.remove(mitarbeiter);
            }


            const leitung = interaction.guild.roles.cache.get(
                config.leitungRolle
            );

            if (leitung && user.roles.cache.has(config.leitungRolle)) {
                await user.roles.remove(leitung);
            }



            const embed = new EmbedBuilder()
                .setTitle("❌ Kündigung")
                .setDescription(
                    `<@${user.id}> wurde aus Diamond Taxi entfernt.\n\n` +
                    `**Grund:** ${grund}`
                )
                .setTimestamp();


            return interaction.reply({
                embeds: [embed]
            });
        }



    } catch (error) {

        console.error(error);


        if (!interaction.replied) {

            await interaction.reply({
                content:
                    "❌ Fehler: " +
                    error.message,
                ephemeral: true
            });

        }
    }
};
