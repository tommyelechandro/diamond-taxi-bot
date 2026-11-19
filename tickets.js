const path = require("path");
const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ChannelType,
    PermissionFlagsBits,
    AttachmentBuilder
} = require("discord.js");
const config = require("./config.js");
const syslog = require("./syslog.js");

// ======================================================
// TICKETS + BEWERBUNGEN
//
// Keine Datenbank: Jedes Ticket ist ein privater Kanal.
//   Kanal-Topic:   ticket|<typ>|<ersteller-id>
//   Info-Nachricht (angepinnt) Footer: diamond-taxi-ticket|<typ>|<ersteller>|<betreuer>|<bilder>
// ======================================================

const cfg = config.tickets;

const KATEGORIEN = {
    beschwerde: { label: "Beschwerden", emoji: "📣", beschreibung: "Du möchtest dich beschweren", mitarbeiter: false, farbe: 0xe74c3c },
    kooperation: { label: "Kooperationen", emoji: "🤝", beschreibung: "Anfragen zu Kooperationen", mitarbeiter: false, farbe: 0x3498db },
    auftrag: { label: "Aufträge", emoji: "📦", beschreibung: "Du möchtest einen Auftrag erteilen", mitarbeiter: true, farbe: 0xf1c40f },
    anliegen: { label: "Andere Anliegen", emoji: "💬", beschreibung: "Alles andere, was du auf dem Herzen hast", mitarbeiter: true, farbe: 0x9b59b6 },
    bewerbung: { label: "Bewerbung", emoji: "📝", beschreibung: "Bewerbung bei Diamond Taxi", mitarbeiter: false, farbe: 0x2ecc71 }
};

const BILDER_NOETIG = 2; // Personalausweis + Führerschein


// ---------- Helfer ----------

function logoDatei() {
    return new AttachmentBuilder(path.join(__dirname, "logo.png"), { name: "logo.png" });
}

function leitungsRollen() {
    return [...new Set([config.leitungRolle, ...config.leitungsebene])];
}

function istLeitung(member) {
    if (!member) return false;
    return leitungsRollen().some(id => member.roles.cache.has(id));
}

function darfBearbeiten(member, typ) {
    if (istLeitung(member)) return true;
    return !!(KATEGORIEN[typ] && KATEGORIEN[typ].mitarbeiter && member.roles.cache.has(config.mitarbeiterRolle));
}

function parseTopic(topic) {
    const m = /^ticket\|([a-z]+)\|(\d+)$/.exec(topic || "");
    return m ? { typ: m[1], uid: m[2] } : null;
}

function parseMeta(embed) {
    const t = (embed?.footer?.text || "").split("|");
    if (t[0] !== "diamond-taxi-ticket") return null;
    return { typ: t[1], uid: t[2], betreuer: t[3], bilder: parseInt(t[4], 10) || 0 };
}

function metaText(m) {
    return `diamond-taxi-ticket|${m.typ}|${m.uid}|${m.betreuer || "0"}|${m.bilder || 0}`;
}

function setzeFeld(embed, name, value) {
    const felder = embed.data.fields ? [...embed.data.fields] : [];
    const i = felder.findIndex(f => f.name === name);
    if (i >= 0) felder[i] = { ...felder[i], value };
    else felder.push({ name, value });
    embed.setFields(felder);
    return embed;
}

function zeile(components) {
    return new ActionRowBuilder().addComponents(components);
}

function datumZeit(ts) {
    return new Date(ts).toLocaleString("de-DE", {
        timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
}

function findeOffenes(guild, typ, uid) {
    return guild.channels.cache.find(c => c.topic === `ticket|${typ}|${uid}`) || null;
}

function kanalName(typ, user) {
    const name = (user.username || "user").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15) || "user";
    return `${typ}-${name}`;
}

function berechtigungen(guild, typ, uid) {

    const erlaubt = [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks
    ];

    const liste = [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: uid, allow: erlaubt },
        { id: guild.client.user.id, allow: [...erlaubt, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages] }
    ];

    for (const id of leitungsRollen()) {
        liste.push({ id, allow: erlaubt });
    }

    if (KATEGORIEN[typ].mitarbeiter) {
        liste.push({ id: config.mitarbeiterRolle, allow: erlaubt });
    }

    return liste;
}

function ticketButtons(typ, eingestellt) {

    const buttons = [
        new ButtonBuilder().setCustomId("tk_claim").setLabel("Übernehmen").setEmoji("🙋").setStyle(ButtonStyle.Primary)
    ];

    if (typ === "bewerbung") {
        buttons.push(
            new ButtonBuilder()
                .setCustomId("tk_hire")
                .setLabel(eingestellt ? "Eingestellt" : "Einstellen")
                .setEmoji("✅")
                .setStyle(ButtonStyle.Success)
                .setDisabled(!!eingestellt)
        );
    }

    buttons.push(new ButtonBuilder().setCustomId("tk_close").setLabel("Schließen").setEmoji("🔒").setStyle(ButtonStyle.Danger));

    return zeile(buttons);
}


async function holeInfoNachricht(channel) {

    const istInfo = m => m.author.id === channel.client.user.id && m.embeds[0]?.footer?.text?.startsWith("diamond-taxi-ticket|");

    try {
        const pins = await channel.messages.fetchPinned();
        const treffer = pins.find(istInfo);
        if (treffer) return treffer;
    } catch (error) {
        // weiter mit Fallback
    }

    try {
        const alteste = await channel.messages.fetch({ after: "0", limit: 10 });
        return alteste.find(istInfo) || null;
    } catch (error) {
        return null;
    }
}


// ---------- Panels ----------

async function sendeSupportPanel(interaction) {

    const embed = new EmbedBuilder()
        .setTitle("🎫 Ticket")
        .setColor(0x5865f2)
        .setDescription(
            "Du hast ein Anliegen oder brauchst Hilfe?\n" +
            "Wähle unten den **Grund** aus – dein Ticket wird sofort für dich erstellt.\n\n" +
            "📣 **Beschwerden** – nur die Leitung sieht dein Ticket\n" +
            "🤝 **Kooperationen** – nur die Leitung sieht dein Ticket\n" +
            "📦 **Aufträge** – Team & Leitung\n" +
            "💬 **Andere Anliegen** – Team & Leitung"
        )
        .setImage("attachment://logo.png")
        .setFooter({ text: "Dein Ticket ist nur für dich und das Team sichtbar." });

    const menu = new StringSelectMenuBuilder()
        .setCustomId("tk_select")
        .setPlaceholder("Grund für dein Ticket wählen …")
        .addOptions(
            ["beschwerde", "kooperation", "auftrag", "anliegen"].map(key => ({
                label: KATEGORIEN[key].label,
                description: KATEGORIEN[key].beschreibung,
                value: key,
                emoji: KATEGORIEN[key].emoji
            }))
        );

    await interaction.channel.send({ embeds: [embed], components: [zeile([menu])], files: [logoDatei()] });

    return interaction.editReply({ content: "✅ Ticket-Panel wurde gesendet." });
}


async function sendeBewerbungPanel(interaction) {

    const embed = new EmbedBuilder()
        .setTitle("💎🚕 Bewerbungen – Diamond Taxi")
        .setColor(0x2ecc71)
        .setDescription(
            "Du möchtest Teil unseres Teams werden? Dann freuen wir uns auf deine Bewerbung!\n\n" +
            "**Voraussetzungen:**\n" +
            "• 🪪 Mindestens Visumstufe 1\n" +
            "• 🗺️ Grundkenntnisse über Los Santos\n" +
            "• 🚕 Sicheres und verantwortungsbewusstes Fahren\n" +
            "• 🤝 Freundliches und respektvolles Auftreten\n\n" +
            "📸 Halte bitte ein Foto von deinem **Personalausweis** und deinem **Führerschein** bereit.\n" +
            "✍️ Bitte schreibe deine Bewerbung selbst.\n\n" +
            "Wir freuen uns auf deine Bewerbung! 💎🚕"
        )
        .setImage("attachment://logo.png")
        .setFooter({ text: "Klicke auf „Jetzt bewerben“ und fülle das Formular aus." });

    const button = new ButtonBuilder()
        .setCustomId("tk_bewerben")
        .setLabel("Jetzt bewerben")
        .setEmoji("📝")
        .setStyle(ButtonStyle.Success);

    await interaction.channel.send({ embeds: [embed], components: [zeile([button])], files: [logoDatei()] });

    return interaction.editReply({ content: "✅ Bewerbungs-Panel wurde gesendet." });
}


// /ticket senden  und  /bewerbung senden
async function handleBefehl(interaction) {

    if (!istLeitung(interaction.member)) {
        return interaction.reply({ content: "❌ Das darf nur die Leitungsebene.", ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    if (interaction.commandName === "ticket") return sendeSupportPanel(interaction);
    if (interaction.commandName === "bewerbung") return sendeBewerbungPanel(interaction);
}


// ---------- Ticket erstellen ----------

async function bewerbungsphaseGeschlossen(guild) {

    try {

        const kanalId = (config.bewerbungsKanal && config.bewerbungsKanal !== "HIER_KANAL_ID_EINTRAGEN")
            ? config.bewerbungsKanal
            : config.teamUpdateKanal;

        const kanal = await guild.channels.fetch(kanalId);
        const nachrichten = await kanal.messages.fetch({ limit: 50 });

        const status = nachrichten.find(m =>
            m.author.id === guild.client.user.id &&
            m.embeds[0]?.footer?.text === "diamond-taxi-bewerbungsphase"
        );

        return !!status && (status.embeds[0].title || "").includes("GESCHLOSSEN");

    } catch (error) {
        return false;
    }
}


async function erstelleKanal(guild, typ, user) {

    const parent = typ === "bewerbung" ? cfg.bewerbungKategorie : cfg.supportKategorie;

    return guild.channels.create({
        name: kanalName(typ, user),
        type: ChannelType.GuildText,
        parent: parent || undefined,
        topic: `ticket|${typ}|${user.id}`,
        permissionOverwrites: berechtigungen(guild, typ, user.id)
    });
}


async function erstelleSupportTicket(interaction, typ) {

    await interaction.deferReply({ ephemeral: true });

    // Auswahl im Panel zurücksetzen
    interaction.message.edit({ components: interaction.message.components }).catch(() => {});

    const guild = interaction.guild;
    const user = interaction.user;
    const k = KATEGORIEN[typ];

    const vorhanden = findeOffenes(guild, typ, user.id);

    if (vorhanden) {
        return interaction.editReply({ content: `❌ Du hast in dieser Kategorie schon ein offenes Ticket: <#${vorhanden.id}>` });
    }

    const kanal = await erstelleKanal(guild, typ, user);

    const embed = new EmbedBuilder()
        .setTitle(`${k.emoji} ${k.label}`)
        .setColor(k.farbe)
        .setDescription("Beschreibe bitte dein Anliegen so genau wie möglich. Das Team meldet sich so schnell wie möglich bei dir.")
        .addFields(
            { name: "Ersteller", value: `<@${user.id}>`, inline: true },
            { name: "Betreuer", value: "– noch niemand –", inline: true },
            { name: "Status", value: "🟡 Offen" }
        )
        .setFooter({ text: metaText({ typ, uid: user.id, betreuer: "0", bilder: 0 }) })
        .setTimestamp();

    const pingRolle = k.mitarbeiter ? config.mitarbeiterRolle : config.leitungRolle;

    const msg = await kanal.send({
        content: `<@${user.id}> <@&${pingRolle}>`,
        embeds: [embed],
        components: [ticketButtons(typ, false)]
    });

    await msg.pin().catch(() => {});

    return interaction.editReply({ content: `✅ Dein Ticket wurde erstellt: <#${kanal.id}>` });
}


// ---------- Bewerbung ----------

async function zeigeBewerbungsFormular(interaction) {

    const guild = interaction.guild;

    if (findeOffenes(guild, "bewerbung", interaction.user.id)) {
        const k = findeOffenes(guild, "bewerbung", interaction.user.id);
        return interaction.reply({ content: `❌ Du hast bereits eine offene Bewerbung: <#${k.id}>`, ephemeral: true });
    }

    const geschlossen = await Promise.race([
        bewerbungsphaseGeschlossen(guild),
        new Promise(resolve => setTimeout(() => resolve(false), 1500))
    ]);

    if (geschlossen) {
        return interaction.reply({
            content: "🔴 Die Bewerbungsphase ist aktuell **geschlossen**. Schau bitte später wieder vorbei!",
            ephemeral: true
        });
    }

    const feld = (id, label, stil, extra) => {
        const input = new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(stil).setRequired(true);
        if (extra.min) input.setMinLength(extra.min);
        if (extra.max) input.setMaxLength(extra.max);
        if (extra.placeholder) input.setPlaceholder(extra.placeholder);
        return zeile([input]);
    };

    const modal = new ModalBuilder()
        .setCustomId("tk_bewerbung_modal")
        .setTitle("Bewerbung – Diamond Taxi")
        .addComponents(
            feld("name", "Name (Vor- und Nachname)", TextInputStyle.Short, { max: 50 }),
            feld("telefon", "Telefonnummer", TextInputStyle.Short, { max: 20 }),
            feld("zeit", "Wann hast du Zeit für ein Gespräch?", TextInputStyle.Short, { max: 100, placeholder: "z. B. Mo-Fr ab 18 Uhr" }),
            feld("about", "Erzähl etwas über dich (3-10 Sätze)", TextInputStyle.Paragraph, {
                min: 150, max: 1000, placeholder: "Wer bist du, was machst du gern, warum möchtest du zu uns? Bitte selbst schreiben."
            }),
            feld("aktiv", "Wie aktiv bist du? (Std. pro Woche)", TextInputStyle.Short, { max: 100, placeholder: "z. B. ca. 15 Stunden pro Woche" })
        );

    return interaction.showModal(modal);
}


async function erstelleBewerbung(interaction) {

    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    const user = interaction.user;

    if (findeOffenes(guild, "bewerbung", user.id)) {
        return interaction.editReply({ content: "❌ Du hast bereits eine offene Bewerbung." });
    }

    const v = id => interaction.fields.getTextInputValue(id).trim();

    const kanal = await erstelleKanal(guild, "bewerbung", user);
    const k = KATEGORIEN.bewerbung;

    const embed = new EmbedBuilder()
        .setTitle("📝 Bewerbung")
        .setColor(k.farbe)
        .addFields(
            { name: "Bewerber", value: `<@${user.id}>`, inline: true },
            { name: "Name", value: v("name"), inline: true },
            { name: "Telefonnummer", value: v("telefon"), inline: true },
            { name: "Zeit für ein Gespräch", value: v("zeit") },
            { name: "Aktivität", value: v("aktiv") },
            { name: "Über sich", value: v("about").slice(0, 1024) },
            { name: "Unterlagen", value: `⏳ 0/${BILDER_NOETIG} – Personalausweis und Führerschein fehlen noch` },
            { name: "Betreuer", value: "– noch niemand –", inline: true },
            { name: "Status", value: "🟡 Offen", inline: true }
        )
        .setFooter({ text: metaText({ typ: "bewerbung", uid: user.id, betreuer: "0", bilder: 0 }) })
        .setTimestamp();

    const msg = await kanal.send({
        content: `<@${user.id}> <@&${config.leitungRolle}>`,
        embeds: [embed],
        components: [ticketButtons("bewerbung", false)]
    });

    await msg.pin().catch(() => {});

    await kanal.send(
        `👋 Hallo <@${user.id}>, danke für deine Bewerbung!\n\n` +
        `📸 **Bitte sende jetzt hier ein Foto von deinem Personalausweis und von deinem Führerschein** (als Bild, zwei Nachrichten oder zusammen).\n` +
        `Ich leite die Bilder sicher weiter und lösche sie hier danach wieder. Die Leitung meldet sich bei dir.`
    );

    // Kopie per DM an den Bewerber
    try {
        const kopie = EmbedBuilder.from(embed)
            .setTitle("📝 Deine Bewerbung bei Diamond Taxi (Kopie)")
            .setFields(embed.data.fields.filter(f => !["Unterlagen", "Betreuer", "Status"].includes(f.name)))
            .setFooter({ text: "Wir melden uns so schnell wie möglich bei dir." });

        await user.send({ content: "✅ Deine Bewerbung ist bei uns eingegangen. Hier ist eine Kopie:", embeds: [kopie] });
    } catch (error) {
        console.error("Bewerbungs-Kopie per DM fehlgeschlagen:", error.message);
    }

    return interaction.editReply({ content: `✅ Deine Bewerbung wurde gesendet: <#${kanal.id}>\nBitte sende dort noch Fotos von Personalausweis und Führerschein.` });
}


// Bilder von Personalausweis / Führerschein weiterleiten
async function handleNachricht(message) {

    if (!message.guild || message.author.bot) return;

    const t = parseTopic(message.channel.topic);
    if (!t || t.typ !== "bewerbung" || t.uid !== message.author.id) return;

    const bilder = [...message.attachments.values()].filter(a => (a.contentType || "").startsWith("image/"));
    if (bilder.length === 0) return;

    const guild = message.guild;

    try {

        const ziel = await guild.channels.fetch(cfg.ausweisKanal);
        const info = await holeInfoNachricht(message.channel);
        const name = info?.embeds[0]?.fields.find(f => f.name === "Name")?.value || message.author.username;

        await ziel.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle(`🪪 Unterlagen – ${name}`)
                    .setColor(0x2ecc71)
                    .addFields(
                        { name: "Bewerber", value: `<@${message.author.id}>`, inline: true },
                        { name: "Ticket", value: `<#${message.channel.id}>`, inline: true }
                    )
                    .setTimestamp()
            ],
            files: bilder.map(a => ({ attachment: a.url, name: a.name }))
        });

        const text = message.content;
        await message.delete().catch(() => {});

        if (text) {
            await message.channel.send(`💬 <@${message.author.id}>: ${text}`).catch(() => {});
        }

        let anzahl = bilder.length;

        if (info) {

            const embed = EmbedBuilder.from(info.embeds[0]);
            const meta = parseMeta(info.embeds[0]);

            meta.bilder += bilder.length;
            anzahl = meta.bilder;

            setzeFeld(embed, "Unterlagen",
                meta.bilder >= BILDER_NOETIG
                    ? `✅ ${meta.bilder} Bild(er) erhalten und weitergeleitet`
                    : `⏳ ${meta.bilder}/${BILDER_NOETIG} – es fehlt noch ein Bild`);

            embed.setFooter({ text: metaText(meta) });

            await info.edit({ embeds: [embed] });
        }

        await message.channel.send(
            anzahl >= BILDER_NOETIG
                ? "✅ Danke! Deine Unterlagen sind angekommen. Die Leitung meldet sich bei dir."
                : `✅ Bild erhalten (${anzahl}/${BILDER_NOETIG}). Bitte sende noch das fehlende Dokument.`
        );

    } catch (error) {
        console.error("Unterlagen weiterleiten fehlgeschlagen:", error.message);
        syslog.log(guild, "Bewerbung: Unterlagen konnten nicht weitergeleitet werden", error.message);
        await message.channel.send("⚠️ Die Bilder konnten nicht weitergeleitet werden. Bitte die Leitung informieren.").catch(() => {});
    }
}


// ---------- Übernehmen / Einstellen / Schließen ----------

async function baueTranskript(channel) {

    let alle = [];
    let vorId;

    for (let i = 0; i < 30; i++) {

        const optionen = { limit: 100 };
        if (vorId) optionen.before = vorId;

        const batch = await channel.messages.fetch(optionen);
        if (batch.size === 0) break;

        alle = alle.concat([...batch.values()]);
        vorId = batch.last().id;

        if (batch.size < 100) break;
    }

    alle.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    const zeilen = alle.map(m => {

        let text = `[${datumZeit(m.createdTimestamp)}] ${m.author.tag}: ${m.content || ""}`;

        for (const e of m.embeds) {
            text += `\n    [Embed] ${[e.title, e.description].filter(Boolean).join(" – ")}`;
            for (const f of e.fields) text += `\n        ${f.name}: ${f.value}`;
        }

        for (const a of m.attachments.values()) {
            text += `\n    [Anhang] ${a.url}`;
        }

        return text;
    });

    return `Ticket-Verlauf: #${channel.name}\nErstellt am: ${datumZeit(channel.createdTimestamp)}\n\n` + zeilen.join("\n");
}


async function schliesseTicket(guild, channel, schliesserId, betreuerId) {

    const t = parseTopic(channel.topic);
    const typ = t ? t.typ : "anliegen";
    const k = KATEGORIEN[typ] || KATEGORIEN.anliegen;

    const text = await baueTranskript(channel);
    const dateiname = `${channel.name}.txt`;
    const logId = typ === "bewerbung" ? cfg.bewerbungsLogKanal : cfg.logKanal;

    const logEmbed = new EmbedBuilder()
        .setTitle(`🔒 Ticket geschlossen – ${k.emoji} ${k.label}`)
        .setColor(0x7f8c8d)
        .addFields(
            { name: "Ersteller", value: t ? `<@${t.uid}>` : "unbekannt", inline: true },
            { name: "Geschlossen von", value: `<@${schliesserId}>`, inline: true },
            { name: "Betreuer", value: betreuerId && betreuerId !== "0" ? `<@${betreuerId}>` : "–", inline: true },
            { name: "Kanal", value: `#${channel.name}` }
        )
        .setTimestamp();

    try {
        const logKanal = await guild.channels.fetch(logId);
        await logKanal.send({
            embeds: [logEmbed],
            files: [new AttachmentBuilder(Buffer.from(text, "utf8"), { name: dateiname })]
        });
    } catch (error) {
        console.error("Ticket-Log fehlgeschlagen:", error.message);
        syslog.log(guild, "Ticket-Log fehlgeschlagen", `Ticket #${channel.name}: ${error.message}`);
    }

    // Verlauf auch per DM an den Ersteller
    if (t) {
        try {
            const user = await guild.client.users.fetch(t.uid);
            await user.send({
                content: `🔒 Dein Ticket bei Diamond Taxi (${k.label}) wurde geschlossen. Hier ist der Verlauf als Datei.`,
                files: [new AttachmentBuilder(Buffer.from(text, "utf8"), { name: dateiname })]
            });
        } catch (error) {
            // DMs aus
        }
    }

    await channel.send("🔒 Ticket wird geschlossen. Dieser Kanal wird in 5 Sekunden gelöscht.").catch(() => {});

    setTimeout(() => {
        channel.delete("Ticket geschlossen").catch(error => console.error("Ticket-Kanal löschen fehlgeschlagen:", error.message));
    }, 5000);
}


async function handleKomponente(interaction, aktualisiereTeamliste) {

    const id = interaction.customId;
    const guild = interaction.guild;

    // ----- Support-Ticket auswählen -----
    if (interaction.isStringSelectMenu() && id === "tk_select") {
        return erstelleSupportTicket(interaction, interaction.values[0]);
    }

    // ----- Bewerbung -----
    if (interaction.isButton() && id === "tk_bewerben") {
        return zeigeBewerbungsFormular(interaction);
    }

    if (interaction.isModalSubmit() && id === "tk_bewerbung_modal") {
        return erstelleBewerbung(interaction);
    }

    if (!interaction.isButton()) return;

    const topic = parseTopic(interaction.channel?.topic);

    // ----- Übernehmen -----
    if (id === "tk_claim") {

        if (!topic || !darfBearbeiten(interaction.member, topic.typ)) {
            return interaction.reply({ content: "❌ Das dürfen nur Mitarbeiter mit Zugriff auf dieses Ticket.", ephemeral: true });
        }

        const embed = EmbedBuilder.from(interaction.message.embeds[0]);
        const meta = parseMeta(interaction.message.embeds[0]);

        meta.betreuer = interaction.user.id;

        setzeFeld(embed, "Betreuer", `<@${interaction.user.id}>`);
        embed.setFooter({ text: metaText(meta) });

        await interaction.update({ embeds: [embed] });

        return interaction.channel.send(`🙋 <@${interaction.user.id}> hat das Ticket übernommen.`);
    }

    // ----- Einstellen (nur Bewerbung, nur Leitung) -----
    if (id === "tk_hire") {

        if (!istLeitung(interaction.member)) {
            return interaction.reply({ content: "❌ Das darf nur die Leitungsebene.", ephemeral: true });
        }

        const meta = parseMeta(interaction.message.embeds[0]);

        await interaction.deferUpdate();

        const member = await guild.members.fetch(meta.uid).catch(() => null);

        if (!member) {
            return interaction.followUp({ content: "❌ Der Bewerber ist nicht mehr auf dem Server.", ephemeral: true });
        }

        const rolle = config.rollen["Praktikant"];

        try {
            await member.roles.add([rolle, config.mitarbeiterRolle], "Einstellung über Bewerbungs-Ticket");
        } catch (error) {
            return interaction.followUp({ content: "❌ Rollen konnten nicht vergeben werden: " + error.message, ephemeral: true });
        }

        try {
            await member.send(
                `🚕💎 Herzlich willkommen bei Diamond Taxi!\n\n` +
                `Wir freuen uns, dass du dich bei uns beworben hast – du wurdest jetzt herzlich als **Praktikant** angenommen!\n\n` +
                `Bei Fragen kannst du dich jederzeit an uns wenden.`
            );
        } catch (error) {
            console.error("Willkommens-DM fehlgeschlagen:", error.message);
        }

        const embed = EmbedBuilder.from(interaction.message.embeds[0]).setColor(0x2ecc71);
        setzeFeld(embed, "Status", `🟢 Eingestellt von <@${interaction.user.id}>`);

        await interaction.editReply({ embeds: [embed], components: [ticketButtons("bewerbung", true)] });

        await interaction.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle("🚕💎 Einstellung")
                    .setColor(0x2ecc71)
                    .setDescription(
                        `Herzlich willkommen <@${meta.uid}>!\n\nDu wurdest als **Praktikant** eingestellt.\n` +
                        `Eingestellt von <@${interaction.user.id}>.`
                    )
                    .setTimestamp()
            ]
        });

        try {
            await aktualisiereTeamliste(guild);
        } catch (error) {
            console.error("Teamliste-Update fehlgeschlagen:", error.message);
        }

        return;
    }

    // ----- Schließen: Bestätigung -----
    if (id === "tk_close") {

        const meta = parseMeta(interaction.message.embeds[0]);

        const erlaubt = topic && (darfBearbeiten(interaction.member, topic.typ) || topic.uid === interaction.user.id);

        if (!erlaubt) {
            return interaction.reply({ content: "❌ Das darfst du nicht.", ephemeral: true });
        }

        return interaction.reply({
            content: "Ticket wirklich schließen? Der Verlauf wird gespeichert und der Kanal gelöscht.",
            components: [zeile([
                new ButtonBuilder().setCustomId(`tk_closeok|${meta ? meta.betreuer : "0"}`).setLabel("Ja, schließen").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId("tk_closenein").setLabel("Abbrechen").setStyle(ButtonStyle.Secondary)
            ])],
            ephemeral: true
        });
    }

    if (id === "tk_closenein") {
        return interaction.update({ content: "Abgebrochen.", components: [] });
    }

    if (id.startsWith("tk_closeok")) {

        const erlaubt = topic && (darfBearbeiten(interaction.member, topic.typ) || topic.uid === interaction.user.id);

        if (!erlaubt) {
            return interaction.reply({ content: "❌ Das darfst du nicht.", ephemeral: true });
        }

        const betreuer = id.split("|")[1] || "0";

        await interaction.update({ content: "🔒 Ticket wird geschlossen …", components: [] });

        return schliesseTicket(guild, interaction.channel, interaction.user.id, betreuer);
    }
}


module.exports = { handleBefehl, handleKomponente, handleNachricht };
