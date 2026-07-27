const { EmbedBuilder } = require("discord.js");
const config = require("./config.js");

// Eindeutiger Marker im Footer, damit wir die alte Teamliste-Nachricht
// wiederfinden und editieren statt jedes Mal eine neue zu senden.
const TEAMLISTE_MARKER = "diamond-taxi-teamliste";


// ======================
// TEAMLISTE (automatisch)
// ======================
async function aktualisiereTeamliste(guild) {

    // Kanal noch nicht konfiguriert -> einfach überspringen
    if (!config.teamUpdateKanal || config.teamUpdateKanal === "HIER_KANAL_ID_EINTRAGEN") {
        return;
    }

    let kanal;

    try {
        kanal = await guild.channels.fetch(config.teamUpdateKanal);
    } catch (error) {
        console.error("Team-Update-Kanal konnte nicht geladen werden:", error.message);
        return;
    }

    if (!kanal) return;

    // Alle Mitglieder laden (benötigt "Server Members Intent" im Dev Portal)
    await guild.members.fetch();

    const felder = [];

    for (const [rang, rollenID] of Object.entries(config.rollen)) {

        const rolle = guild.roles.cache.get(rollenID);
        if (!rolle) continue;

        const mitglieder = rolle.members.map(m => `<@${m.id}>`);

        if (mitglieder.length > 0) {
            felder.push({
                name: `${rang} (${mitglieder.length})`,
                value: mitglieder.join("\n").slice(0, 1024) // Discord Feld-Limit
            });
        }
    }

    const embed = new EmbedBuilder()
        .setTitle("🚕💎 Diamond Taxi – Teamliste")
        .setColor(0x1abc9c)
        .setDescription(
            felder.length > 0
                ? "Aktuelle Mitarbeiter, sortiert nach Rang:"
                : "Aktuell sind keine Mitarbeiter eingetragen."
        )
        .addFields(felder.slice(0, 25)) // Discord Embed-Limit: max. 25 Felder
        .setFooter({ text: TEAMLISTE_MARKER })
        .setTimestamp();

    try {

        const nachrichten = await kanal.messages.fetch({ limit: 50 });

        const alteTeamliste = nachrichten.find(msg =>
            msg.author.id === guild.client.user.id &&
            msg.embeds[0]?.footer?.text === TEAMLISTE_MARKER
        );

        if (alteTeamliste) {
            await alteTeamliste.edit({ embeds: [embed] });
        } else {
            await kanal.send({ embeds: [embed] });
        }

    } catch (error) {
        console.error("Teamliste konnte nicht gesendet/aktualisiert werden:", error.message);
    }
}


module.exports = async (interaction) => {

    if (!interaction.isChatInputCommand()) return;

    try {

        // ======================
        // TEAMLISTE (manuell)
        // ======================
        if (interaction.commandName === "teamliste") {

            await interaction.deferReply({ ephemeral: true });
            await aktualisiereTeamliste(interaction.guild);

            return interaction.editReply({
                content: "✅ Teamliste wurde aktualisiert."
            });
        }


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


            await interaction.reply({
                embeds: [embed]
            });

            try {
                await aktualisiereTeamliste(interaction.guild);
            } catch (error) {
                console.error("Teamliste-Update fehlgeschlagen:", error.message);
            }

            return;
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


            await interaction.reply({
                embeds: [embed]
            });

            try {
                await aktualisiereTeamliste(interaction.guild);
            } catch (error) {
                console.error("Teamliste-Update fehlgeschlagen:", error.message);
            }

            return;
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


            await interaction.reply({
                embeds: [embed]
            });

            try {
                await aktualisiereTeamliste(interaction.guild);
            } catch (error) {
                console.error("Teamliste-Update fehlgeschlagen:", error.message);
            }

            return;
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


            await interaction.reply({
                embeds: [embed]
            });

            try {
                await aktualisiereTeamliste(interaction.guild);
            } catch (error) {
                console.error("Teamliste-Update fehlgeschlagen:", error.message);
            }

            return;
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
};
