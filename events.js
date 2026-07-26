const { EmbedBuilder } = require("discord.js");
const config = require("./config.js");

module.exports = async (interaction) => {

    if (!interaction.isChatInputCommand()) return;


    const user = interaction.options.getMember("mitarbeiter");


    // Funktion: alte Rangrollen entfernen
    async function entferneRang(user) {
        for (const rolle of Object.values(config.rollen)) {
            if (user.roles.cache.has(rolle)) {
                await user.roles.remove(rolle);
            }
        }
    }


    // Funktion: neuen Rang geben
    async function gebeRang(user, rang) {

        const rolle = interaction.guild.roles.cache.get(
            config.rollen[rang]
        );

        if (!rolle) {
            throw new Error("Rolle nicht gefunden");
        }

        await user.roles.add(rolle);

        // Mitarbeiterrolle geben
        await user.roles.add(config.mitarbeiterRolle);


        // Leitungsebene prüfen
        if (config.leitungsebene.includes(config.rollen[rang])) {
            await user.roles.add(config.leitungRolle);
        } else {

            if (user.roles.cache.has(config.leitungRolle)) {
                await user.roles.remove(config.leitungRolle);
            }

        }
    }



    // =========================
    // EINSTELLUNG
    // =========================

    if (interaction.commandName === "einstellung") {

        const rang = interaction.options.getString("rang");
        const grund = interaction.options.getString("grund");

        await gebeRang(user, rang);


        const embed = new EmbedBuilder()
            .setTitle("🚕💎 Einstellung")
            .setDescription(
                `Herzlich willkommen <@${user.id}>!\n\n` +
                `Du wurdest als **${rang}** bei Diamond Taxi eingestellt.\n\n` +
                `**Grund:** ${grund}\n\n` +
                `Wir wünschen dir viel Erfolg im Team!`
            )
            .setTimestamp();


        return interaction.reply({
            embeds: [embed]
        });
    }




    // =========================
    // BEFÖRDERUNG
    // =========================

    if (interaction.commandName === "beförderung") {

        const rang = interaction.options.getString("rang");
        const nachricht = interaction.options.getString("nachricht");
        const lob = interaction.options.getString("lob");


        await entferneRang(user);

        await gebeRang(user, rang);


        let zusatz = "";

        if (nachricht) {
            zusatz = nachricht;
        } 
        else if (lob) {
            zusatz = lob;
        }
        else {
            zusatz = "Wir wünschen dir weiterhin viel Erfolg bei Diamond Taxi!";
        }


        const embed = new EmbedBuilder()
            .setTitle("🚕💎 Beförderung")
            .setDescription(
                `Herzlichen Glückwunsch <@${user.id}>!\n\n` +
                `Du wurdest zum **${rang}** befördert.\n\n` +
                `**Nachricht der Leitung:**\n${zusatz}`
            )
            .setTimestamp();


        return interaction.reply({
            embeds: [embed]
        });

    }





    // =========================
    // DEGRADIERUNG
    // =========================

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





    // =========================
    // KÜNDIGUNG
    // =========================

    if (interaction.commandName === "kündigung") {


        const grund = interaction.options.getString("grund");


        await entferneRang(user);


        if (user.roles.cache.has(config.mitarbeiterRolle)) {
            await user.roles.remove(config.mitarbeiterRolle);
        }


        if (user.roles.cache.has(config.leitungRolle)) {
            await user.roles.remove(config.leitungRolle);
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

};
