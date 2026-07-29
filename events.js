const {
    EmbedBuilder,
    StringSelectMenuBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");
const config = require("./config.js");

// Eindeutige Marker im Footer, damit wir alte Bot-Nachrichten wiederfinden
// und editieren, statt jedes Mal eine neue zu senden.
const TEAMLISTE_MARKER = "diamond-taxi-teamliste";
const BEWERBUNG_MARKER = "diamond-taxi-bewerbungsphase";
const GEBURTSTAGS_MARKER = "diamond-taxi-geburtstagsliste";
const ABMELDUNG_MARKER = "diamond-taxi-abmeldeliste";
const LOTTO_MARKER_EINTRAEGE = "diamond-taxi-lotto-eintraege";


function formatBetrag(zahl) {
    return zahl.toLocaleString("de-DE") + " $";
}


// Datum im Format TT.MM.JJJJ -> Date-Objekt
function parseDatumMitJahr(input, defaultStunde, defaultMinute) {

    const match = /^([0-9]{1,2})\.([0-9]{1,2})\.([0-9]{4})$/.exec(input.trim());
    if (!match) return null;

    const tag = parseInt(match[1], 10);
    const monat = parseInt(match[2], 10);
    const jahr = parseInt(match[3], 10);

    if (monat < 1 || monat > 12) return null;

    const tageProMonat = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (tag < 1 || tag > tageProMonat[monat - 1]) return null;

    return new Date(jahr, monat - 1, tag, defaultStunde, defaultMinute, 0);
}


// ======================
// TEAMLISTE (automatisch, CEO oben - Praktikant unten)
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

    // Object.entries behält die Reihenfolge aus config.js -> dort steht CEO zuerst
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
                ? "Aktuelle Mitarbeiter, sortiert nach Rang (höchster zuerst):"
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
// BEWERBUNGSPHASE (live Status + Countdown + Bild + LIVE-Button)
// ======================
async function holeBewerbungsBild(guild, nachrichtID) {

    try {

        if (!config.bewerbungsphaseBilderKanal || !nachrichtID) return null;

        const bilderKanal = await guild.channels.fetch(config.bewerbungsphaseBilderKanal);
        const nachricht = await bilderKanal.messages.fetch(nachrichtID);

        return nachricht.attachments.first()?.url || null;

    } catch (error) {
        console.error("Bewerbungsphase-Bild konnte nicht geladen werden:", error.message);
        return null;
    }
}


async function aktualisiereBewerbungsStatus(guild, status, terminInput) {

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

    const bildFallbackOffen = "https://placehold.co/700x150/2ecc71/ffffff.png?text=Bewerbungsphase+OFFEN";
    const bildFallbackGeschlossen = "https://placehold.co/700x150/e74c3c/ffffff.png?text=Bewerbungsphase+GESCHLOSSEN";

    const bildUrl = await holeBewerbungsBild(
        guild,
        istOffen ? config.bewerbungsphaseNachrichtOffenID : config.bewerbungsphaseNachrichtGeschlossenID
    ) || (istOffen ? bildFallbackOffen : bildFallbackGeschlossen);

    const embed = new EmbedBuilder()
        .setTitle(istOffen ? "🟢 Bewerbungsphase: OFFEN" : "🔴 Bewerbungsphase: GESCHLOSSEN")
        .setColor(istOffen ? 0x2ecc71 : 0xe74c3c)
        .setDescription(
            istOffen
                ? "Wir suchen aktuell aktiv nach neuen Mitarbeitern! Öffnet ein Ticket, um euch zu bewerben."
                : "Aktuell nehmen wir keine neuen Bewerbungen an. Schaut später wieder vorbei!"
        )
        .setImage(bildUrl)
        .setFooter({ text: BEWERBUNG_MARKER })
        .setTimestamp();

    if (terminInput) {

        const datum = parseDatumMitJahr(terminInput, istOffen ? 18 : 9, 0);

        if (datum) {
            const unix = Math.floor(datum.getTime() / 1000);
            embed.addFields({
                name: istOffen ? "Schließt voraussichtlich am" : "Wieder offen ab",
                value: `<t:${unix}:F>  (<t:${unix}:R>)`
            });
        }
    }

    const liveButton = new ButtonBuilder()
        .setCustomId("bewerbungsphase_status_anzeige")
        .setLabel(istOffen ? "🔴 LIVE" : "⚪ Geschlossen")
        .setStyle(istOffen ? ButtonStyle.Danger : ButtonStyle.Secondary)
        .setDisabled(true);

    const row = new ActionRowBuilder().addComponents(liveButton);

    try {

        const nachrichten = await kanal.messages.fetch({ limit: 50 });

        const alterStatus = nachrichten.find(msg =>
            msg.author.id === guild.client.user.id &&
            msg.embeds[0]?.footer?.text === BEWERBUNG_MARKER
        );

        if (alterStatus) {
            await alterStatus.edit({ embeds: [embed], components: [row] });
        } else {
            await kanal.send({ embeds: [embed], components: [row] });
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
// ABMELDELISTE (live, mit Rückkehr-Countdown)
// ======================

function parseAbmeldeZeile(zeile) {

    const match = /^<@!?([0-9]+)>\s*-\s*<t:([0-9]+):d>\s*bis\s*<t:([0-9]+):d>\s*\(wieder da <t:[0-9]+:R>\)\s*-\s*Grund:\s*(.+)$/.exec(zeile.trim());
    if (!match) return null;

    return {
        id: match[1],
        vonUnix: parseInt(match[2], 10),
        bisUnix: parseInt(match[3], 10),
        grund: match[4]
    };
}


function baueAbmeldeZeile(e) {
    return `<@${e.id}> - <t:${e.vonUnix}:d> bis <t:${e.bisUnix}:d> (wieder da <t:${e.bisUnix}:R>) - Grund: ${e.grund}`;
}


async function aktualisiereAbmeldeliste(guild, neuerEintrag) {

    if (!config.abmeldungKanal || config.abmeldungKanal === "HIER_KANAL_ID_EINTRAGEN") {
        return null;
    }

    const kanal = await guild.channels.fetch(config.abmeldungKanal);
    const nachrichten = await kanal.messages.fetch({ limit: 50 });

    const alteListe = nachrichten.find(msg =>
        msg.author.id === guild.client.user.id &&
        msg.embeds[0]?.footer?.text === ABMELDUNG_MARKER
    );

    let eintraege = alteListe
        ? (alteListe.embeds[0].fields[0]?.value || "").split("\n").map(parseAbmeldeZeile).filter(Boolean)
        : [];

    const jetzt = Math.floor(Date.now() / 1000);

    // abgelaufene Abmeldungen automatisch entfernen
    eintraege = eintraege.filter(e => e.bisUnix > jetzt);

    if (neuerEintrag) {
        eintraege = eintraege.filter(e => e.id !== neuerEintrag.id);
        eintraege.push(neuerEintrag);
    }

    eintraege.sort((a, b) => a.bisUnix - b.bisUnix);

    const embed = new EmbedBuilder()
        .setTitle("📋 Aktuelle Abmeldungen")
        .setColor(0x95a5a6)
        .setDescription("Automatisch aktualisiert – abgelaufene Einträge verschwinden von selbst.")
        .addFields({
            name: "Abmeldungen",
            value: eintraege.length > 0
                ? eintraege.map(baueAbmeldeZeile).join("\n").slice(0, 1024)
                : "Aktuell ist niemand abgemeldet."
        })
        .setFooter({ text: ABMELDUNG_MARKER })
        .setTimestamp();

    if (alteListe) {
        await alteListe.edit({ embeds: [embed] });
    } else {
        await kanal.send({ embeds: [embed] });
    }

    return kanal;
}


async function bereinigeAbmeldungen(guild) {
    try {
        await aktualisiereAbmeldeliste(guild, null);
    } catch (error) {
        console.error("Abmeldeliste-Bereinigung fehlgeschlagen:", error.message);
    }
}


// ======================
// LOTTO
// ======================

function parseLottoZeilen(feldValue) {

    if (!feldValue) return [];

    return feldValue.split("\n").map(zeile => {

        const match = /^<@!?([0-9]+)>\s*-\s*([0-9]+),\s*([0-9]+)$/.exec(zeile.trim());
        if (!match) return null;

        return { id: match[1], zahlen: [parseInt(match[2], 10), parseInt(match[3], 10)] };

    }).filter(Boolean);
}


function baueLottoEmbed(eintraege) {

    return new EmbedBuilder()
        .setTitle("🎰 Diamond Taxi Lotto – Aktuelle Tipps")
        .setColor(0x8e44ad)
        .setDescription("Mit `/lotto` mitspielen! Ziehung jeden Mittwoch & Sonntag um 20 Uhr. Wähle 2 Zahlen von 1-10.")
        .addFields({
            name: "Teilnehmer",
            value: eintraege.length > 0
                ? eintraege.map(e => `<@${e.id}> - ${e.zahlen.join(", ")}`).join("\n").slice(0, 1024)
                : "Noch keine Tipps abgegeben."
        })
        .setFooter({ text: LOTTO_MARKER_EINTRAEGE })
        .setTimestamp();
}


async function trageLottoEintragEin(guild, userId, zahlen) {

    const kanal = await guild.channels.fetch(config.lottoKanal);
    const nachrichten = await kanal.messages.fetch({ limit: 50 });

    const alteListe = nachrichten.find(msg =>
        msg.author.id === guild.client.user.id &&
        msg.embeds[0]?.footer?.text === LOTTO_MARKER_EINTRAEGE
    );

    let eintraege = alteListe
        ? parseLottoZeilen(alteListe.embeds[0].fields[0]?.value)
        : [];

    eintraege = eintraege.filter(e => e.id !== userId);
    eintraege.push({ id: userId, zahlen });

    const embed = baueLottoEmbed(eintraege);

    if (alteListe) {
        await alteListe.edit({ embeds: [embed] });
    } else {
        await kanal.send({ embeds: [embed] });
    }
}


async function ziehungDurchfuehren(guild) {

    try {

        if (!config.lottoKanal || config.lottoKanal === "HIER_KANAL_ID_EINTRAGEN") return;

        const kanal = await guild.channels.fetch(config.lottoKanal);
        const nachrichten = await kanal.messages.fetch({ limit: 50 });

        const heuteString = new Date().toISOString().slice(0, 10);
        const ziehungsMarker = `diamond-taxi-lotto-ziehung-${heuteString}`;

        const schonGezogen = nachrichten.some(msg =>
            msg.author.id === guild.client.user.id &&
            msg.embeds[0]?.footer?.text === ziehungsMarker
        );

        if (schonGezogen) return;

        const alteListe = nachrichten.find(msg =>
            msg.author.id === guild.client.user.id &&
            msg.embeds[0]?.footer?.text === LOTTO_MARKER_EINTRAEGE
        );

        const eintraege = alteListe
            ? parseLottoZeilen(alteListe.embeds[0].fields[0]?.value)
            : [];

        const pool = Array.from({ length: 10 }, (_, i) => i + 1);
        const gewinnzahlen = [];

        for (let i = 0; i < 2; i++) {
            const index = Math.floor(Math.random() * pool.length);
            gewinnzahlen.push(pool.splice(index, 1)[0]);
        }
        gewinnzahlen.sort((a, b) => a - b);

        const gewinner = eintraege.filter(e =>
            e.zahlen.length === 2 && e.zahlen.every(z => gewinnzahlen.includes(z))
        );

        const gesamtpreis = Math.floor(Math.random() * (100000 - 20000 + 1)) + 20000;
        const preisProGewinner = gewinner.length > 0 ? Math.floor(gesamtpreis / gewinner.length) : 0;

        const embed = new EmbedBuilder()
            .setTitle("🎰 Diamond Taxi Lotto – Ziehung")
            .setColor(gewinner.length > 0 ? 0xf1c40f : 0x7f8c8d)
            .addFields(
                { name: "Gewinnzahlen", value: gewinnzahlen.join(", ") },
                { name: "Gesamtpreis", value: formatBetrag(gesamtpreis) },
                {
                    name: "Gewinner",
                    value: gewinner.length > 0
                        ? gewinner.map(g => `<@${g.id}> – ${formatBetrag(preisProGewinner)}`).join("\n")
                        : "Diesmal hat leider niemand gewonnen."
                }
            )
            .setFooter({ text: ziehungsMarker })
            .setTimestamp();

        await kanal.send({ embeds: [embed] });

        if (alteListe) {
            await alteListe.edit({ embeds: [baueLottoEmbed([])] });
        }

    } catch (error) {
        console.error("Lotto-Ziehung fehlgeschlagen:", error.message);
    }
}


// ======================
// TAGES-ZITAT
// ======================
const FALLBACK_ZITATE = [
    "Der frühe Vogel fängt den Wurm.",
    "Wer kämpft, kann verlieren. Wer nicht kämpft, hat schon verloren.",
    "Steter Tropfen höhlt den Stein.",
    "Aller Anfang ist schwer.",
    "Übung macht den Meister.",
    "Ohne Fleiß kein Preis.",
    "Kleine Schritte führen auch zum Ziel.",
    "Was dich nicht umbringt, macht dich stärker.",
    "Der Weg ist das Ziel.",
    "Wer nicht wagt, der nicht gewinnt."
];


async function posteTagesZitat(guild) {

    try {

        if (!config.zitatKanal || config.zitatKanal === "HIER_KANAL_ID_EINTRAGEN") return;

        const kanal = await guild.channels.fetch(config.zitatKanal);

        const heuteString = new Date().toISOString().slice(0, 10);
        const markerText = `diamond-taxi-zitat-${heuteString}`;

        const letzteNachrichten = await kanal.messages.fetch({ limit: 5 });

        const schonGepostet = letzteNachrichten.some(msg =>
            msg.author.id === guild.client.user.id &&
            msg.embeds[0]?.footer?.text === markerText
        );

        if (schonGepostet) return;

        let zitatText = null;
        let autor = null;

        try {
            const response = await fetch("https://zenquotes.io/api/today");
            const daten = await response.json();
            if (Array.isArray(daten) && daten[0]?.q) {
                zitatText = daten[0].q;
                autor = daten[0].a;
            }
        } catch (error) {
            console.error("Zitat-API nicht erreichbar, nutze Fallback:", error.message);
        }

        if (!zitatText) {
            zitatText = FALLBACK_ZITATE[Math.floor(Math.random() * FALLBACK_ZITATE.length)];
        }

        const embed = new EmbedBuilder()
            .setTitle("💬 Zitat des Tages")
            .setDescription(`*${zitatText}*` + (autor ? `\n— ${autor}` : ""))
            .setColor(0x2c3e50)
            .setFooter({ text: markerText })
            .setTimestamp();

        await kanal.send({ embeds: [embed] });

    } catch (error) {
        console.error("Tages-Zitat fehlgeschlagen:", error.message);
    }
}


// ======================
// HAUPT-HANDLER
// ======================
const handleInteraction = async (interaction) => {

    if (!interaction.isChatInputCommand() && !interaction.isStringSelectMenu()) return;

    try {

        // ======================
        // SANKTIONS-AUSWAHLMENÜ (Mehrfachauswahl-Antwort)
        // ======================
        if (interaction.isStringSelectMenu()) {

            if (!interaction.customId.startsWith("sanktion_select|")) return;

            const [, zielUserId, fristUnixStr] = interaction.customId.split("|");
            const fristUnix = parseInt(fristUnixStr, 10);

            const ausgewaehlt = interaction.values
                .map(v => config.sanktionen.find(s => String(s.paragraph) === v))
                .filter(Boolean);

            const gesamtbetrag = ausgewaehlt.reduce((summe, s) => summe + s.betrag, 0);

            const gruendeText = ausgewaehlt
                .map(s => `§${s.paragraph} – ${s.text} (${formatBetrag(s.betrag)})`)
                .join("\n");

            if (!config.sanktionsKanal || config.sanktionsKanal === "HIER_KANAL_ID_EINTRAGEN") {
                return interaction.update({
                    content: "❌ Kein Sanktions-Kanal in config.js eingetragen.",
                    components: []
                });
            }

            const kanal = await interaction.guild.channels.fetch(config.sanktionsKanal);
            const markerText = `diamond-taxi-sanktion-offen-${zielUserId}-${Date.now()}`;

            const embed = new EmbedBuilder()
                .setTitle("⚖️ Sanktion")
                .setColor(0xe67e22)
                .addFields(
                    { name: "Mitarbeiter", value: `<@${zielUserId}>` },
                    { name: "Verstöße", value: gruendeText.slice(0, 1024) },
                    { name: "Gesamtbetrag", value: formatBetrag(gesamtbetrag) },
                    { name: "Ausgestellt von", value: `<@${interaction.user.id}>` },
                    { name: "Frist", value: `<t:${fristUnix}:F>  (<t:${fristUnix}:R>)` },
                    { name: "Status", value: "🟡 Offen" }
                )
                .setFooter({ text: markerText })
                .setTimestamp();

            await kanal.send({ embeds: [embed] });

            try {
                const zielUser = await interaction.client.users.fetch(zielUserId);
                await zielUser.send(
                    `⚖️ Du wurdest bei Diamond Taxi sanktioniert.\n\n` +
                    `**Verstöße:**\n${gruendeText}\n\n` +
                    `**Gesamtbetrag:** ${formatBetrag(gesamtbetrag)}\n` +
                    `**Frist:** <t:${fristUnix}:F> (<t:${fristUnix}:R>)\n\n` +
                    `Bitte begleiche den Betrag fristgerecht.`
                );
            } catch (error) {
                console.error("DM an sanktionierten Mitarbeiter fehlgeschlagen:", error.message);
            }

            return interaction.update({
                content: `✅ Sanktion für <@${zielUserId}> wurde ausgestellt und in <#${kanal.id}> gepostet.`,
                components: []
            });
        }


        // ======================
        // TEAMLISTE (manuell)
        // ======================
        if (interaction.commandName === "teamliste") {

            await interaction.deferReply({ ephemeral: true });
            await aktualisiereTeamliste(interaction.guild);

            return interaction.editReply({ content: "✅ Teamliste wurde aktualisiert." });
        }


        // ======================
        // BEWERBUNGSPHASE
        // ======================
        if (interaction.commandName === "bewerbungsphase") {

            const status = interaction.options.getString("status");
            const eigeneNachricht = interaction.options.getString("nachricht");
            const wiederoeffnung = interaction.options.getString("wiederoeffnung");
            const naechsteSchliessung = interaction.options.getString("naechste_schliessung");

            await interaction.deferReply({ ephemeral: true });

            const terminInput = status === "offen" ? naechsteSchliessung : wiederoeffnung;

            const kanal = await aktualisiereBewerbungsStatus(interaction.guild, status, terminInput);

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


        // ======================
        // ANKÜNDIGUNG
        // ======================
        if (interaction.commandName === "ankündigung") {

            const text = interaction.options.getString("text");

            if (!config.ankuendigungsKanal || config.ankuendigungsKanal === "HIER_KANAL_ID_EINTRAGEN") {
                return interaction.reply({
                    content: "❌ Kein Ankündigungs-Kanal in config.js eingetragen.",
                    ephemeral: true
                });
            }

            await interaction.deferReply({ ephemeral: true });

            const kanal = await interaction.guild.channels.fetch(config.ankuendigungsKanal);

            const embed = new EmbedBuilder()
                .setTitle("📢 Ankündigung")
                .setDescription(text)
                .setColor(0x3498db)
                .setTimestamp();

            const nachricht = await kanal.send({
                content: `<@&${config.bürgerRolle}>`,
                embeds: [embed]
            });

            await nachricht.react("✅");

            return interaction.editReply({ content: "✅ Ankündigung wurde gepostet." });
        }


        // ======================
        // TEAMBESPRECHUNG
        // ======================
        if (interaction.commandName === "teambesprechung") {

            const datum = interaction.options.getString("datum");
            const ort = interaction.options.getString("ort");
            const uhrzeit = interaction.options.getString("uhrzeit");
            const info = interaction.options.getString("info");

            if (!config.teambesprechungKanal || config.teambesprechungKanal === "HIER_KANAL_ID_EINTRAGEN") {
                return interaction.reply({
                    content: "❌ Kein Teambesprechungs-Kanal in config.js eingetragen.",
                    ephemeral: true
                });
            }

            await interaction.deferReply({ ephemeral: true });

            const kanal = await interaction.guild.channels.fetch(config.teambesprechungKanal);

            const embed = new EmbedBuilder()
                .setTitle("🗓️ Teambesprechung")
                .setColor(0x9b59b6)
                .addFields(
                    { name: "Datum", value: datum, inline: true },
                    { name: "Uhrzeit", value: uhrzeit || "Noch offen", inline: true },
                    { name: "Ort", value: ort }
                )
                .setDescription(info || "Bitte reagiert mit ✅ oder ❌, ob ihr teilnehmen könnt.")
                .setTimestamp();

            const nachricht = await kanal.send({
                content: `<@&${config.bürgerRolle}>`,
                embeds: [embed]
            });

            await nachricht.react("✅");
            await nachricht.react("❌");

            await interaction.guild.members.fetch();

            const mitarbeiterRolle = interaction.guild.roles.cache.get(config.mitarbeiterRolle);

            let dmErfolgreich = 0;
            let dmFehlgeschlagen = 0;

            if (mitarbeiterRolle) {

                for (const [, mitglied] of mitarbeiterRolle.members) {

                    try {
                        await mitglied.send(
                            `Hallo ${mitglied.displayName},\n\n` +
                            `wir haben bald eine Teambesprechung am **${datum}**` +
                            (uhrzeit ? ` um **${uhrzeit}**` : "") +
                            ` bei **${ort}**.\n` +
                            (info ? `${info}\n\n` : "\n") +
                            `Kommst du oder kommst du nicht? Falls du nicht kommen kannst, melde dich bitte im Kanal ab.`
                        );
                        dmErfolgreich++;
                    } catch (error) {
                        dmFehlgeschlagen++;
                    }
                }
            }

            return interaction.editReply({
                content:
                    `✅ Teambesprechung wurde gepostet. ${dmErfolgreich} Mitarbeiter per DM benachrichtigt` +
                    (dmFehlgeschlagen > 0 ? `, ${dmFehlgeschlagen} DMs fehlgeschlagen (evtl. DMs deaktiviert).` : ".")
            });
        }


        // ======================
        // ABMELDUNG
        // ======================
        if (interaction.commandName === "abmeldung") {

            const vonInput = interaction.options.getString("von");
            const bisInput = interaction.options.getString("bis");
            const grund = interaction.options.getString("grund");

            const vonDatum = parseDatumMitJahr(vonInput, 0, 0);
            const bisDatum = parseDatumMitJahr(bisInput, 23, 59);

            if (!vonDatum || !bisDatum) {
                return interaction.reply({
                    content: "❌ Bitte gib beide Daten im Format TT.MM.JJJJ an.",
                    ephemeral: true
                });
            }

            if (bisDatum <= vonDatum) {
                return interaction.reply({
                    content: "❌ Das 'bis'-Datum muss nach dem 'von'-Datum liegen.",
                    ephemeral: true
                });
            }

            await interaction.deferReply({ ephemeral: true });

            const eintrag = {
                id: interaction.user.id,
                vonUnix: Math.floor(vonDatum.getTime() / 1000),
                bisUnix: Math.floor(bisDatum.getTime() / 1000),
                grund
            };

            const kanal = await aktualisiereAbmeldeliste(interaction.guild, eintrag);

            if (!kanal) {
                return interaction.editReply({ content: "❌ Kein Abmeldungs-Kanal in config.js eingetragen." });
            }

            return interaction.editReply({ content: "✅ Deine Abmeldung wurde eingetragen." });
        }


        // ======================
        // LOTTO
        // ======================
        if (interaction.commandName === "lotto") {

            const zahl1 = interaction.options.getInteger("zahl1");
            const zahl2 = interaction.options.getInteger("zahl2");

            if (zahl1 === zahl2) {
                return interaction.reply({
                    content: "❌ Bitte wähle zwei unterschiedliche Zahlen.",
                    ephemeral: true
                });
            }

            if (!config.lottoKanal || config.lottoKanal === "HIER_KANAL_ID_EINTRAGEN") {
                return interaction.reply({
                    content: "❌ Kein Lotto-Kanal in config.js eingetragen.",
                    ephemeral: true
                });
            }

            await interaction.deferReply({ ephemeral: true });

            await trageLottoEintragEin(
                interaction.guild,
                interaction.user.id,
                [zahl1, zahl2].sort((a, b) => a - b)
            );

            return interaction.editReply({
                content: `✅ Dein Tipp (${zahl1}, ${zahl2}) wurde für die nächste Ziehung eingetragen!`
            });
        }


        // ======================
        // SANKTION (ausstellen / bezahlt)
        // ======================
        if (interaction.commandName === "sanktion") {

            const sub = interaction.options.getSubcommand();


            if (sub === "ausstellen") {

                const zielMitglied = interaction.options.getMember("mitarbeiter");
                const fristInput = interaction.options.getString("frist");

                const fristDatum = parseDatumMitJahr(fristInput, 23, 59);

                if (!fristDatum) {
                    return interaction.reply({
                        content: "❌ Bitte gib die Frist im Format TT.MM.JJJJ an, z. B. `30.07.2026`.",
                        ephemeral: true
                    });
                }

                const fristUnix = Math.floor(fristDatum.getTime() / 1000);

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`sanktion_select|${zielMitglied.id}|${fristUnix}`)
                    .setPlaceholder("Verstöße auswählen (mehrere möglich)")
                    .setMinValues(1)
                    .setMaxValues(config.sanktionen.length)
                    .addOptions(
                        config.sanktionen.map(s => ({
                            label: `§${s.paragraph} – ${s.text}`.slice(0, 100),
                            description: formatBetrag(s.betrag),
                            value: String(s.paragraph)
                        }))
                    );

                const row = new ActionRowBuilder().addComponents(selectMenu);

                return interaction.reply({
                    content: `Wähle einen oder mehrere Verstöße für <@${zielMitglied.id}> aus:`,
                    components: [row],
                    ephemeral: true
                });
            }


            if (sub === "bezahlt") {

                const zielMitglied = interaction.options.getMember("mitarbeiter");

                await interaction.deferReply({ ephemeral: true });

                if (!config.sanktionsKanal || config.sanktionsKanal === "HIER_KANAL_ID_EINTRAGEN") {
                    return interaction.editReply({ content: "❌ Kein Sanktions-Kanal in config.js eingetragen." });
                }

                const kanal = await interaction.guild.channels.fetch(config.sanktionsKanal);
                const nachrichten = await kanal.messages.fetch({ limit: 100 });

                const offeneSanktionen = nachrichten.filter(msg =>
                    msg.author.id === interaction.guild.client.user.id &&
                    msg.embeds[0]?.footer?.text?.startsWith(`diamond-taxi-sanktion-offen-${zielMitglied.id}-`)
                );

                if (offeneSanktionen.size === 0) {
                    return interaction.editReply({ content: "ℹ️ Keine offene Sanktion für diesen Mitarbeiter gefunden." });
                }

                for (const msg of offeneSanktionen.values()) {

                    const altesEmbed = msg.embeds[0];

                    const neueFelder = altesEmbed.fields.map(f =>
                        f.name === "Status"
                            ? { name: "Status", value: "✅ Bezahlt" }
                            : { name: f.name, value: f.value, inline: f.inline }
                    );

                    const neuesEmbed = EmbedBuilder.from(altesEmbed)
                        .setColor(0x2ecc71)
                        .setFields(neueFelder)
                        .setFooter({ text: altesEmbed.footer.text.replace("-offen-", "-bezahlt-") });

                    await msg.edit({ embeds: [neuesEmbed] });
                }

                return interaction.editReply({
                    content: `✅ ${offeneSanktionen.size} Sanktion(en) für <@${zielMitglied.id}> als bezahlt markiert.`
                });
            }

            return;
        }


        const user = interaction.options.getMember("mitarbeiter");


        async function entferneRang(user) {
            for (const rolleID of Object.values(config.rollen)) {

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

            const mitarbeiter = interaction.guild.roles.cache.get(config.mitarbeiterRolle);

            if (mitarbeiter) {
                await user.roles.add(mitarbeiter);
            }

            if (config.leitungsebene.includes(rollenID)) {

                const leitung = interaction.guild.roles.cache.get(config.leitungRolle);

                if (leitung) {
                    await user.roles.add(leitung);
                }

            } else {

                const leitung = interaction.guild.roles.cache.get(config.leitungRolle);

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


            try {
                await user.send(
                    `🚕💎 Herzlich willkommen bei Diamond Taxi!\n\n` +
                    `Wir freuen uns, dass du dich bei uns beworben hast – du wurdest jetzt herzlich als **${rang}** angenommen!\n\n` +
                    `Bei Fragen kannst du dich jederzeit an uns wenden.`
                );
            } catch (error) {
                console.error("Willkommens-DM fehlgeschlagen:", error.message);
            }


            const embed = new EmbedBuilder()
                .setTitle("🚕💎 Einstellung")
                .setDescription(
                    `Herzlich willkommen <@${user.id}>!\n\n` +
                    `Du wurdest als **${rang}** eingestellt.\n\n` +
                    `**Grund:** ${grund}\n\n` +
                    `Wir wünschen dir viel Erfolg bei Diamond Taxi!`
                )
                .setTimestamp();


            await interaction.reply({ embeds: [embed] });

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


            await interaction.reply({ embeds: [embed] });

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


            await interaction.reply({ embeds: [embed] });

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


            try {
                await user.send(
                    `Schade, dass du uns verlässt.\n\n` +
                    `Trotzdem wünscht dir das Diamond Taxi und Tommy Elechandro viel Erfolg für deine Zukunft!`
                );
            } catch (error) {
                console.error("Abschieds-DM fehlgeschlagen:", error.message);
            }


            await entferneRang(user);


            const mitarbeiter = interaction.guild.roles.cache.get(config.mitarbeiterRolle);

            if (mitarbeiter && user.roles.cache.has(config.mitarbeiterRolle)) {
                await user.roles.remove(mitarbeiter);
            }


            const leitung = interaction.guild.roles.cache.get(config.leitungRolle);

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


            await interaction.reply({ embeds: [embed] });

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
handleInteraction.bereinigeAbmeldungen = bereinigeAbmeldungen;
handleInteraction.ziehungDurchfuehren = ziehungDurchfuehren;
handleInteraction.posteTagesZitat = posteTagesZitat;

module.exports = handleInteraction;
