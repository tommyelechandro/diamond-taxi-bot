const { EmbedBuilder } = require("discord.js");
const config = require("./config.js");

// Eindeutige Marker im Footer, damit wir alte Bot-Nachrichten wiederfinden
// und editieren, statt jedes Mal eine neue zu senden.
const TEAMLISTE_MARKER = "diamond-taxi-teamliste";
const BEWERBUNG_MARKER = "diamond-taxi-bewerbungsphase";
const GEBURTSTAGS_MARKER = "diamond-taxi-geburtstagsliste";


// ======================
// TEAMLISTE (automatisch)
// ======================
async function aktualisiereTeamliste(guild) {

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

    await guild.members.fetch();

    const felder = [];

    for (const [rang, rollenID] of Object.entries(config.rollen)) {

        const rolle = guild.roles.cache.get(rollenID);
        if (!rolle) continue;

        const mitglieder = rolle.members.map(m => `<@${m.id}>`);

        if (mitglieder.length > 0) {
            felder.push({
                name: `${rang} (${mitglieder.length})`,
                value: mitglieder.join("\n").slice(0, 1024)
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
        .addFields(felder.slice(0, 25))
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


// ======================
// BEWERBUNGSPHASE (live Status)
// ======================
async function aktualisiereBewerbungsStatus(guild, status) {

    const kanalID =
        (config.bewerbungsKanal && config.bewerbungsKanal !== "HIER_KANAL_ID_EINTRAGEN")
            ? config.bewerbungsKanal
            : config.teamUpdateKanal;

    if (!kanalID || kanalID === "HIER_KANAL_ID_EINTRAGEN") {
        return null;
    }

    let kanal;

    try {
        kanal = await guild.channels.fetch(kanalID);
    } catch (error) {
        console.error("Bewerbungs-Kanal konnte nicht geladen werden:", error.message);
        return null;
    }

    if (!kanal) return null;

    const istOffen = status === "offen";

    const embed = new EmbedBuilder()
        .setTitle(istOffen ? "🟢 Bewerbungsphase: OFFEN" : "🔴 Bewerbungsphase: GESCHLOSSEN")
        .setColor(istOffen ? 0x2ecc71 : 0xe74c3c)
        .setDescription(
            istOffen
                ? "Wir suchen aktuell aktiv nach neuen Mitarbeitern! Öffnet ein Ticket, um euch zu bewerben."
                : "Aktuell nehmen wir keine neuen Bewerbungen an. Schaut später wieder vorbei!"
        )
        .setImage(
            istOffen
                ? "https://placehold.co/700x150/2ecc71/ffffff.png?text=Bewerbungsphase+OFFEN"
                : "https://placehold.co/700x150/e74c3c/ffffff.png?text=Bewerbungsphase+GESCHLOSSEN"
        )
        .setFooter({ text: BEWERBUNG_MARKER })
        .setTimestamp();

    try {

        const nachrichten = await kanal.messages.fetch({ limit: 50 });

        const alterStatus = nachrichten.find(msg =>
            msg.author.id === guild.client.user.id &&
            msg.embeds[0]?.footer?.text === BEWERBUNG_MARKER
        );

        if (alterStatus) {
            await alterStatus.edit({ embeds: [embed] });
        } else {
            await kanal.send({ embeds: [embed] });
        }

    } catch (error) {
        console.error("Bewerbungsstatus konnte nicht aktualisiert werden:", error.message);
    }

    return kanal;
}


// ======================
// GEBURTSTAGSLISTE
// ======================

function parseDatum(input) {

    const match = /^([0-9]{1,2})\.([0-9]{1,2})$/.exec(input.trim());
    if (!match) return null;

    const tag = parseInt(match[1], 10);
    const monat = parseInt(match[2], 10);

    if (monat < 1 || monat > 12) return null;

    const tageProMonat = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (tag < 1 || tag > tageProMonat[monat - 1]) return null;

    return { tag, monat };
}


function parseListenFeld(feldValue) {

    if (!feldValue) return [];

    return feldValue.split("\n").map(zeile => {

        const match = /^<@!?([0-9]+)>\s*-\s*([0-9]{1,2})\.([0-9]{1,2})$/.exec(zeile.trim());
        if (!match) return null;

        return {
            id: match[1],
            tag: parseInt(match[2], 10),
            monat: parseInt(match[3], 10)
        };

    }).filter(Boolean);
}


function baueListenFeld(eintraege) {

    const sortiert = [...eintraege].sort((a, b) =>
        a.monat - b.monat || a.tag - b.tag
    );

    return sortiert
        .map(e => `<@${e.id}> - ${String(e.tag).padStart(2, "0")}.${String(e.monat).padStart(2, "0")}`)
        .join("\n")
        .slice(0, 1024);
}


async function findeGeburtstagsListe(guild) {

    if (!config.geburtstagsKanal || config.geburtstagsKanal === "HIER_KANAL_ID_EINTRAGEN") {
        return null;
    }

    const kanal = await guild.channels.fetch(config.geburtstagsKanal);
    if (!kanal) return null;

    const nachrichten = await kanal.messages.fetch({ limit: 50 });

    const liste = nachrichten.find(msg =>
        msg.author.id === guild.client.user.id &&
        msg.embeds[0]?.footer?.text === GEBURTSTAGS_MARKER
    );

    return { kanal, liste };
}


async function setzeGeburtstag(guild, userId, tag, monat) {

    if (!config.geburtstagsKanal || config.geburtstagsKanal === "HIER_KANAL_ID_EINTRAGEN") {
        throw new Error("Geburtstags-Kanal ist noch nicht in config.js eingetragen.");
    }

    const daten = await findeGeburtstagsListe(guild);

    let eintraege = daten.liste
        ? parseListenFeld(daten.liste.embeds[0].fields[0]?.value)
        : [];

    eintraege = eintraege.filter(e => e.id !== userId);
    eintraege.push({ id: userId, tag, monat });

    const embed = new EmbedBuilder()
        .setTitle("🎂 Diamond Taxi – Geburtstagsliste")
        .setColor(0xf1c40f)
        .setDescription("Trag deinen Geburtstag mit `/geburtstag` ein – der Bot gratuliert automatisch am richtigen Tag!")
        .addFields({
            name: "Geburtstage",
            value: baueListenFeld(eintraege) || "Noch keine Einträge."
        })
        .setFooter({ text: GEBURTSTAGS_MARKER })
        .setTimestamp();

    if (daten.liste) {
        await daten.liste.edit({ embeds: [embed] });
    } else {
        await daten.kanal.send({ embeds: [embed] });
    }
}


async function pruefeGeburtstage(guild) {

    try {

        const daten = await findeGeburtstagsListe(guild);
        if (!daten || !daten.liste) return;

        const eintraege = parseListenFeld(daten.liste.embeds[0].fields[0]?.value);

        const heute = new Date();
        const tag = heute.getDate();
        const monat = heute.getMonth() + 1;
        const heuteString = heute.toISOString().slice(0, 10);

        const geburtstagsKinder = eintraege.filter(e => e.tag === tag && e.monat === monat);
        if (geburtstagsKinder.length === 0) return;

        const kanal = daten.kanal;
        const letzteNachrichten = await kanal.messages.fetch({ limit: 30 });

        for (const person of geburtstagsKinder) {

            const markerText = `diamond-taxi-geburtstag-${heuteString}-${person.id}`;

            const schonGratuliert = letzteNachrichten.some(msg =>
                msg.author.id === guild.client.user.id &&
                msg.embeds[0]?.footer?.text === markerText
            );

            if (schonGratuliert) continue;

            const embed = new EmbedBuilder()
                .setTitle("🎉🎂 Alles Gute zum Geburtstag!")
                .setDescription(
                    `Herzlichen Glückwunsch <@${person.id}>! Das ganze Team von Diamond Taxi wünscht dir alles Gute! 🥳`
                )
                .setColor(0xf1c40f)
                .setFooter({ text: markerText })
                .setTimestamp();

            await kanal.send({ embeds: [embed] });
        }

    } catch (error) {
        console.error("Geburtstags-Check fehlgeschlagen:", error.message);
    }
}


// ======================
// HAUPT-HANDLER
// ======================
const handleInteraction = async (interaction) => {

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


        // ======================
        // BEWERBUNGSPHASE
        // ======================
        if (interaction.commandName === "bewerbungsphase") {

            const status = interaction.options.getString("status");
            const eigeneNachricht = interaction.options.getString("nachricht");

            await interaction.deferReply({ ephemeral: true });

            const kanal = await aktualisiereBewerbungsStatus(interaction.guild, status);

            if (!kanal) {
                return interaction.editReply({
                    content: "❌ Kein Kanal konfiguriert. Trag in config.js bei `bewerbungsKanal` oder `teamUpdateKanal` eine Kanal-ID ein."
                });
            }

            if (status === "offen") {

                const text = eigeneNachricht ||
                    "Ab sofort ist unsere Bewerbungsphase wieder offen! Öffnet ein Ticket und schreibt uns, wann ihr Zeit für ein Bewerbungsgespräch habt – wir kümmern uns darum.";

                await kanal.send({
                    content: `<@&${config.bürgerRolle}>\n\n${text}`
                });
            }

            return interaction.editReply({
                content: status === "offen"
                    ? "✅ Bewerbungsphase wurde geöffnet, alle Bürger wurden benachrichtigt."
                    : "✅ Bewerbungsphase wurde geschlossen."
            });
        }


        // ======================
        // GEBURTSTAG
        // ======================
        if (interaction.commandName === "geburtstag") {

            const datum = interaction.options.getString("datum");
            const geparst = parseDatum(datum);

            if (!geparst) {
                return interaction.reply({
                    content: "❌ Bitte gib dein Datum im Format TT.MM an, z. B. `24.12` für den 24. Dezember.",
                    ephemeral: true
                });
            }

            await interaction.deferReply({ ephemeral: true });

            try {
                await setzeGeburtstag(interaction.guild, interaction.user.id, geparst.tag, geparst.monat);
                return interaction.editReply({ content: "✅ Dein Geburtstag wurde gespeichert!" });
            } catch (error) {
                return interaction.editReply({ content: "❌ Fehler: " + error.message });
            }
        }


        const user = interaction.options.getMember("mitarbeiter");


        async function entferneRang(user) {
            for (const rolleID of Object.values(config.rollen)) {

                // Sicherheitsnetz: Bürgerrolle wird NIEMALS entfernt, egal was passiert
                if (rolleID === config.bürgerRolle) continue;

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


            // Bürgerrolle wird hier bewusst NICHT angefasst - bleibt für immer bestehen
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

        const fehlerNachricht = "❌ Fehler: " + error.message;

        try {

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: fehlerNachricht });
            } else {
                await interaction.reply({ content: fehlerNachricht, ephemeral: true });
            }

        } catch (zweiterFehler) {
            console.error("Fehlermeldung konnte nicht gesendet werden:", zweiterFehler.message);
        }
    }
};


handleInteraction.pruefeGeburtstage = pruefeGeburtstage;

module.exports = handleInteraction;
