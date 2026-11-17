const {
    EmbedBuilder,
    StringSelectMenuBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");
const config = require("./config.js");

// ======================================================
// SANKTIONEN + STRIKES
//
// Speicherung ohne Datenbank: Jede Sanktion ist ein Embed im Sanktionskanal.
// Im Footer steht:
//   diamond-taxi-sanktion-<offen|bezahlt|ohne>-<userId>-<timestamp>|<kat1,kat2>|<strikes>[|K]
// Daraus berechnet der Bot beim nächsten Mal:
//   - aktive Strikes (nicht älter als config.strikeAblaufTage)
//   - die Verstoß-Stufe pro Kategorie (1., 2., 3. Verstoß ...)
// "|K" = diese Sanktion hat zur Kündigung geführt -> Strikes davor werden zurückgesetzt.
// ======================================================

const TAG_MS = 24 * 60 * 60 * 1000;
const ENTWURF_LEBENSDAUER_MS = 30 * 60 * 1000;
const MAX_EIGENE = 5;
const FOOTER_REGEX = /^diamond-taxi-sanktion-(?:offen|bezahlt|ohne)-(\d+)-\d+(?:\|([^|]*)\|(\d+)(\|K)?)?$/;

// Entwürfe leben nur im Arbeitsspeicher (30 Min.), bis jemand "Ausstellen" klickt.
const entwuerfe = new Map();


// ---------- Helfer ----------

function formatBetrag(zahl) {
    return zahl.toLocaleString("de-DE") + " $";
}

function betragLabel(b) {
    return b > 0 ? formatBetrag(b) : "keine Geldstrafe";
}

function strikeLabel(n) {
    if (n <= 0) return "kein Strike";
    return n === 1 ? "1 Strike" : `${n} Strikes`;
}

function kanalKonfiguriert() {
    return config.sanktionsKanal && config.sanktionsKanal !== "HIER_KANAL_ID_EINTRAGEN";
}

function findeKategorie(key) {
    return config.sanktionen.find(k => k.key === key) || null;
}

function kurzBetrag(b) {
    if (b >= 1000000) return `${String(b / 1000000).replace(".", ",")}M`;
    return `${b / 1000}k`;
}

function stufeKurz(s) {
    if (s.kuendigung) return "Kündigung";
    const teile = [];
    if (s.betrag > 0) teile.push(kurzBetrag(s.betrag));
    if (s.strikes > 0) teile.push(`${s.strikes} Strike${s.strikes > 1 ? "s" : ""}`);
    return teile.length ? teile.join("+") : "Verw.";
}


// Holt alle Nachrichten seit einem Zeitpunkt (Pagination), älteste zuerst
async function holeNachrichtenSeit(kanal, seitMs) {

    let alle = [];
    let vorId;

    while (true) {

        const optionen = { limit: 100 };
        if (vorId) optionen.before = vorId;

        const batch = await kanal.messages.fetch(optionen);
        if (batch.size === 0) break;

        const arr = Array.from(batch.values());
        alle = alle.concat(arr);

        const aelteste = arr[arr.length - 1];
        vorId = aelteste.id;

        if (aelteste.createdTimestamp < seitMs) break;
        if (batch.size < 100) break;
    }

    return alle
        .filter(m => m.createdTimestamp >= seitMs)
        .sort((a, b) => a.createdTimestamp - b.createdTimestamp);
}


// Liest die Sanktions-Historie eines Mitarbeiters (letzte X Tage)
async function holeHistorie(guild, userId) {

    const historie = { aktiveStrikes: 0, zaehler: {}, eintraege: [] };

    if (!kanalKonfiguriert()) return historie;

    const kanal = await guild.channels.fetch(config.sanktionsKanal);
    const seit = Date.now() - config.strikeAblaufTage * TAG_MS;
    const nachrichten = await holeNachrichtenSeit(kanal, seit);

    for (const msg of nachrichten) {

        if (msg.author.id !== guild.client.user.id) continue;

        const m = FOOTER_REGEX.exec(msg.embeds[0]?.footer?.text || "");
        if (!m || m[1] !== userId) continue;

        // Kündigung -> alles davor zurücksetzen
        if (m[4]) {
            historie.aktiveStrikes = 0;
            historie.zaehler = {};
            historie.eintraege = [];
            continue;
        }

        const keys = m[2] ? m[2].split(",").filter(Boolean) : [];
        const strikes = m[3] ? parseInt(m[3], 10) : 0;

        for (const key of keys) {
            historie.zaehler[key] = (historie.zaehler[key] || 0) + 1;
        }

        historie.aktiveStrikes += strikes;

        if (strikes > 0) {
            historie.eintraege.push({ ts: Math.floor(msg.createdTimestamp / 1000), strikes });
        }
    }

    return historie;
}


// ---------- Berechnung ----------

function berechneItems(e) {

    const items = [];

    for (const key of e.kategorien) {

        const kat = findeKategorie(key);
        if (!kat) continue;

        const bisher = e.historie.zaehler[key] || 0;
        const stufe = kat.stufen[Math.min(bisher, kat.stufen.length - 1)];

        items.push({
            key,
            name: kat.name,
            nr: bisher + 1,
            text: stufe.text,
            betrag: stufe.betrag,
            strikes: stufe.strikes,
            kuendigung: !!stufe.kuendigung
        });
    }

    for (const eigene of e.eigene) {
        items.push({
            key: null,
            name: eigene.titel,
            nr: null,
            text: "Eigene Sanktion",
            betrag: eigene.betrag,
            strikes: eigene.strikes,
            kuendigung: false
        });
    }

    return items;
}


function berechneSumme(e, items) {

    items = items || berechneItems(e);

    const vorschlagBetrag = items.reduce((a, i) => a + i.betrag, 0);
    const vorschlagStrikes = items.reduce((a, i) => a + i.strikes, 0);

    const betrag = e.betragOverride !== null ? e.betragOverride : vorschlagBetrag;
    const strikes = e.strikesOverride !== null ? e.strikesOverride : vorschlagStrikes;

    const gesamt = e.historie.aktiveStrikes + strikes;
    const kuendigung = gesamt >= config.maxStrikes || items.some(i => i.kuendigung);

    return {
        vorschlagBetrag,
        vorschlagStrikes,
        betrag,
        strikes,
        gesamt,
        kuendigung,
        betragAngepasst: e.betragOverride !== null && e.betragOverride !== vorschlagBetrag,
        strikesAngepasst: e.strikesOverride !== null && e.strikesOverride !== vorschlagStrikes
    };
}


function itemZeile(i) {

    const kopf = i.key
        ? `**${i.name}** – ${i.nr}. Verstoß (${i.text})`
        : `**${i.name}** (Eigene Sanktion)`;

    const folge = i.kuendigung
        ? "⛔ Kündigung"
        : `${betragLabel(i.betrag)} · ${strikeLabel(i.strikes)}`;

    return `• ${kopf}: ${folge}`;
}


function folgeHinweis(gesamt, kuendigung) {

    const max = config.maxStrikes;

    if (kuendigung) return "⛔ **Kündigung wird automatisch ausgelöst** (alle Ränge außer Bürger werden entfernt).";

    const rest = max - gesamt;

    if (gesamt > 0 && rest === 1) return "⚠️ **Letzte Chance** – ein weiterer Strike führt zur Kündigung.";
    if (gesamt > 0) return `ℹ️ Noch ${rest} Strikes bis zur Kündigung.`;

    return "";
}


// ---------- Ansicht (Entwurf) ----------

function baueAnsicht(e) {

    const items = berechneItems(e);
    const s = berechneSumme(e, items);
    const max = config.maxStrikes;

    const embed = new EmbedBuilder()
        .setTitle("⚖️ Sanktion vorbereiten")
        .setColor(s.kuendigung ? 0xc0392b : 0xe67e22)
        .setDescription(
            `Mitarbeiter: <@${e.zielId}>\n` +
            `Aktive Strikes: **${e.historie.aktiveStrikes}/${max}** (laufen nach ${config.strikeAblaufTage} Tagen ab)`
        )
        .setFooter({ text: "Entwurf – läuft nach 30 Minuten ab" });

    if (items.length === 0) {

        embed.addFields({
            name: "Verstöße",
            value: "Noch nichts ausgewählt – wähle unten Verstöße aus oder füge eine eigene Sanktion hinzu."
        });

    } else {

        const strikeZeile =
            `${s.strikes > 0 ? "+" + s.strikes : "keine"} ` +
            (s.strikesAngepasst ? `(angepasst, Vorschlag: ${s.vorschlagStrikes})` : "(Vorschlag)") +
            `\nStand danach: **${Math.min(s.gesamt, max)}/${max}**`;

        const hinweis = folgeHinweis(s.gesamt, s.kuendigung);

        embed.addFields(
            { name: "Verstöße", value: items.map(itemZeile).join("\n").slice(0, 1024) },
            {
                name: "Gesamtbetrag",
                value: formatBetrag(s.betrag) +
                    (s.betragAngepasst ? ` (angepasst, Vorschlag: ${formatBetrag(s.vorschlagBetrag)})` : "")
            },
            { name: "Strikes", value: strikeZeile + (hinweis ? `\n${hinweis}` : "") }
        );
    }

    const menu = new StringSelectMenuBuilder()
        .setCustomId(`sanktion_select|${e.token}`)
        .setPlaceholder("Verstöße auswählen (mehrere möglich)")
        .setMinValues(0)
        .setMaxValues(config.sanktionen.length)
        .addOptions(
            config.sanktionen.map(k => ({
                label: `${k.emoji} ${k.name}`.slice(0, 100),
                description: k.stufen.map((st, i) => `${i + 1}: ${stufeKurz(st)}`).join(" | ").slice(0, 100),
                value: k.key,
                default: e.kategorien.includes(k.key)
            }))
        );

    const buttons = [
        new ButtonBuilder()
            .setCustomId(`sanktion_btn|ok|${e.token}`)
            .setLabel("Ausstellen")
            .setEmoji("✅")
            .setStyle(ButtonStyle.Success)
            .setDisabled(items.length === 0),
        new ButtonBuilder()
            .setCustomId(`sanktion_btn|anpassen|${e.token}`)
            .setLabel("Strikes/Betrag ändern")
            .setEmoji("✏️")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(items.length === 0),
        new ButtonBuilder()
            .setCustomId(`sanktion_btn|eigene|${e.token}`)
            .setLabel("Eigene Sanktion")
            .setEmoji("➕")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(e.eigene.length >= MAX_EIGENE)
    ];

    if (e.eigene.length > 0) {
        buttons.push(
            new ButtonBuilder()
                .setCustomId(`sanktion_btn|eigene_zurueck|${e.token}`)
                .setLabel("Letzte eigene entfernen")
                .setEmoji("↩️")
                .setStyle(ButtonStyle.Secondary)
        );
    }

    buttons.push(
        new ButtonBuilder()
            .setCustomId(`sanktion_btn|abbrechen|${e.token}`)
            .setLabel("Abbrechen")
            .setEmoji("🗑️")
            .setStyle(ButtonStyle.Danger)
    );

    return {
        content: "",
        embeds: [embed],
        components: [
            new ActionRowBuilder().addComponents(menu),
            new ActionRowBuilder().addComponents(buttons)
        ]
    };
}


// ---------- DM an den Mitarbeiter ----------

function baueDM(items, s, fristUnix) {

    const max = config.maxStrikes;
    const stand = Math.min(s.gesamt, max);

    let text = `⚖️ **Du wurdest bei Diamond Taxi sanktioniert.**\n\n`;
    text += `**Verstöße:**\n${items.map(itemZeile).join("\n").slice(0, 1200)}\n\n`;

    text += s.betrag > 0
        ? `**Geldstrafe:** ${formatBetrag(s.betrag)} – zahlbar bis <t:${fristUnix}:F> (<t:${fristUnix}:R>)\n`
        : `**Geldstrafe:** keine\n`;

    text += s.strikes > 0
        ? `**Strikes:** +${s.strikes} → aktueller Stand **${stand}/${max}**\n`
        : `**Strikes:** keine neuen (aktueller Stand **${stand}/${max}**)\n`;

    text += `*Strikes laufen nach ${config.strikeAblaufTage} Tagen ab.*\n\n`;

    if (s.kuendigung) {
        text += s.gesamt >= max
            ? `❌ **Du hast ${max} Strikes erreicht – dir wurde gekündigt.** Alle deine Ränge wurden entfernt.`
            : `❌ **Aufgrund der Schwere bzw. Häufigkeit der Verstöße wurde dir gekündigt.** Alle deine Ränge wurden entfernt.`;
    } else {
        const hinweis = folgeHinweis(s.gesamt, false);
        if (hinweis) text += hinweis.replace(/\*\*/g, "**") + "\n\n";
        if (s.betrag > 0) text += `Bitte begleiche den Betrag fristgerecht. `;
        text += `Bei Fragen wende dich an die Leitung.`;
    }

    return text.slice(0, 2000);
}


// ---------- Automatische Kündigung ----------

async function kuendigeAutomatisch(guild, zielId, aktualisiereTeamliste) {

    const member = await guild.members.fetch(zielId).catch(() => null);

    if (!member) {
        return { ok: false, fehler: "Mitglied ist nicht (mehr) auf dem Server." };
    }

    // Alle Ränge + Mitarbeiter- + Leitungsrolle entfernen. Bürgerrolle bleibt IMMER.
    const ids = [...new Set([
        ...Object.values(config.rollen),
        config.mitarbeiterRolle,
        config.leitungRolle
    ])].filter(id => id !== config["bürgerRolle"] && member.roles.cache.has(id));

    try {
        if (ids.length > 0) {
            await member.roles.remove(ids, "Automatische Kündigung (Strike-Limit / schwerer Verstoß)");
        }
    } catch (error) {
        console.error("Auto-Kündigung: Rollen entfernen fehlgeschlagen:", error.message);
        return { ok: false, fehler: error.message };
    }

    try {
        await aktualisiereTeamliste(guild);
    } catch (error) {
        console.error("Teamliste-Update fehlgeschlagen:", error.message);
    }

    return { ok: true };
}


// ---------- Sanktion ausstellen ----------

async function stelleAus(interaction, e, aktualisiereTeamliste) {

    await interaction.deferUpdate();

    const guild = interaction.guild;

    // Strikes direkt vor dem Ausstellen frisch einlesen
    try {
        e.historie = await holeHistorie(guild, e.zielId);
    } catch (error) {
        console.error("Historie konnte nicht aktualisiert werden:", error.message);
    }

    const items = berechneItems(e);

    if (items.length === 0) {
        return interaction.followUp({ content: "❌ Es ist kein Verstoß ausgewählt.", ephemeral: true });
    }

    if (!kanalKonfiguriert()) {
        return interaction.editReply({ content: "❌ Kein Sanktions-Kanal in config.js eingetragen.", embeds: [], components: [] });
    }

    const s = berechneSumme(e, items);
    const max = config.maxStrikes;

    const fristUnix = s.betrag > 0
        ? (e.fristUnix || Math.floor((Date.now() + 7 * TAG_MS) / 1000))
        : null;

    const kanal = await guild.channels.fetch(config.sanktionsKanal);

    const typ = s.betrag > 0 ? "offen" : "ohne";
    const keys = items.filter(i => i.key).map(i => i.key);
    const footer =
        `diamond-taxi-sanktion-${typ}-${e.zielId}-${Date.now()}|${keys.join(",")}|${s.strikes}` +
        (s.kuendigung ? "|K" : "");

    const embed = new EmbedBuilder()
        .setTitle("⚖️ Sanktion")
        .setColor(s.kuendigung ? 0xc0392b : 0xe67e22)
        .addFields(
            { name: "Mitarbeiter", value: `<@${e.zielId}>` },
            { name: "Verstöße", value: items.map(itemZeile).join("\n").slice(0, 1024) },
            { name: "Gesamtbetrag", value: formatBetrag(s.betrag) },
            {
                name: "Strikes",
                value: s.strikes > 0
                    ? `+${s.strikes} → **${Math.min(s.gesamt, max)}/${max}**`
                    : `Keine neuen (Stand: **${Math.min(s.gesamt, max)}/${max}**)`
            },
            { name: "Ausgestellt von", value: `<@${e.ausstellerId}>` }
        )
        .setFooter({ text: footer })
        .setTimestamp();

    if (s.betrag > 0) {
        embed.addFields(
            { name: "Frist", value: `<t:${fristUnix}:F>  (<t:${fristUnix}:R>)` },
            { name: "Status", value: "🟡 Offen" }
        );
    } else {
        embed.addFields({ name: "Status", value: "ℹ️ Keine Zahlung erforderlich" });
    }

    if (s.kuendigung) {
        embed.addFields({
            name: "Folge",
            value: s.gesamt >= max
                ? `❌ Automatische Kündigung (${max} Strikes erreicht)`
                : "❌ Automatische Kündigung (schwerer Verstoß)"
        });
    }

    await kanal.send({ embeds: [embed] });

    // DM an den Mitarbeiter
    let dmOk = true;

    try {
        const zielUser = await interaction.client.users.fetch(e.zielId);
        await zielUser.send(baueDM(items, s, fristUnix));
    } catch (error) {
        dmOk = false;
        console.error("DM an sanktionierten Mitarbeiter fehlgeschlagen:", error.message);
    }

    // Kündigung
    let kuendigungText = "";

    if (s.kuendigung) {

        const ergebnis = await kuendigeAutomatisch(guild, e.zielId, aktualisiereTeamliste);

        kuendigungText = ergebnis.ok
            ? "\n❌ Der Mitarbeiter wurde **automatisch gekündigt** – alle Ränge außer Bürger wurden entfernt."
            : `\n⚠️ Kündigung war fällig, aber die Rollen konnten nicht entfernt werden: ${ergebnis.fehler}\n` +
              `Bitte Rollen manuell entfernen bzw. Bot-Rolle in der Rollenliste nach oben schieben.`;
    }

    entwuerfe.delete(e.token);

    return interaction.editReply({
        content:
            `✅ Sanktion für <@${e.zielId}> ausgestellt und in <#${kanal.id}> gepostet.\n` +
            `Betrag: ${formatBetrag(s.betrag)} · Strikes: ${s.strikes > 0 ? "+" + s.strikes : "keine"} ` +
            `(Stand ${Math.min(s.gesamt, max)}/${max})` +
            (dmOk ? "" : "\n⚠️ DM konnte nicht zugestellt werden (DMs deaktiviert?).") +
            kuendigungText,
        embeds: [],
        components: []
    });
}


// ---------- Öffentliche Funktionen ----------

async function starteEntwurf(interaction, zielId, fristUnix) {

    await interaction.deferReply({ ephemeral: true });

    if (!kanalKonfiguriert()) {
        return interaction.editReply({ content: "❌ Kein Sanktions-Kanal in config.js eingetragen." });
    }

    let historie;

    try {
        historie = await holeHistorie(interaction.guild, zielId);
    } catch (error) {
        console.error("Sanktions-Historie konnte nicht geladen werden:", error.message);
        return interaction.editReply({ content: "❌ Sanktions-Historie konnte nicht geladen werden: " + error.message });
    }

    // alte Entwürfe aufräumen
    for (const [token, entwurf] of entwuerfe) {
        if (Date.now() - entwurf.erstellt > ENTWURF_LEBENSDAUER_MS) entwuerfe.delete(token);
    }

    const token = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

    const entwurf = {
        token,
        zielId,
        ausstellerId: interaction.user.id,
        fristUnix,
        historie,
        kategorien: [],
        eigene: [],
        strikesOverride: null,
        betragOverride: null,
        erstellt: Date.now()
    };

    entwuerfe.set(token, entwurf);

    return interaction.editReply(baueAnsicht(entwurf));
}


async function zeigeStrikes(interaction, zielId) {

    await interaction.deferReply({ ephemeral: true });

    let historie;

    try {
        historie = await holeHistorie(interaction.guild, zielId);
    } catch (error) {
        return interaction.editReply({ content: "❌ Konnte Strikes nicht laden: " + error.message });
    }

    const max = config.maxStrikes;
    let text = `📊 <@${zielId}> hat aktuell **${Math.min(historie.aktiveStrikes, max)}/${max} Strikes**.`;

    if (historie.eintraege.length > 0) {
        text += "\n\n" + historie.eintraege.map(eintrag => {
            const ablauf = eintrag.ts + config.strikeAblaufTage * 24 * 60 * 60;
            return `• <t:${eintrag.ts}:d>: +${eintrag.strikes} Strike${eintrag.strikes > 1 ? "s" : ""} – läuft <t:${ablauf}:R> ab`;
        }).join("\n");
    }

    return interaction.editReply({ content: text });
}


function parseZahl(wert) {
    const ziffern = String(wert).replace(/[^0-9]/g, "");
    if (!ziffern) return NaN;
    return parseInt(ziffern, 10);
}


// Select-Menüs, Buttons und Modals der Sanktions-Oberfläche
async function handleKomponente(interaction, aktualisiereTeamliste) {

    const teile = interaction.customId.split("|");
    const istSelect = interaction.isStringSelectMenu();
    const aktion = istSelect ? "select" : teile[1];
    const token = istSelect ? teile[1] : teile[2];

    const e = entwuerfe.get(token);

    if (!e) {
        return interaction.reply({
            content: "⌛ Dieser Entwurf ist abgelaufen. Bitte starte `/sanktion ausstellen` erneut.",
            ephemeral: true
        });
    }

    if (e.ausstellerId !== interaction.user.id) {
        return interaction.reply({ content: "❌ Das ist nicht dein Entwurf.", ephemeral: true });
    }

    // ----- Verstöße ausgewählt -----
    if (istSelect) {
        e.kategorien = interaction.values;
        e.strikesOverride = null;
        e.betragOverride = null;
        return interaction.update(baueAnsicht(e));
    }

    // ----- Buttons -----
    if (interaction.isButton()) {

        if (aktion === "abbrechen") {
            entwuerfe.delete(token);
            return interaction.update({ content: "🗑️ Sanktion abgebrochen.", embeds: [], components: [] });
        }

        if (aktion === "eigene_zurueck") {
            e.eigene.pop();
            e.strikesOverride = null;
            e.betragOverride = null;
            return interaction.update(baueAnsicht(e));
        }

        if (aktion === "ok") {
            return stelleAus(interaction, e, aktualisiereTeamliste);
        }

        if (aktion === "eigene") {

            const modal = new ModalBuilder()
                .setCustomId(`sanktion_modal|eigene|${token}`)
                .setTitle("Eigene Sanktion hinzufügen")
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("titel")
                            .setLabel("Grund / Bezeichnung")
                            .setStyle(TextInputStyle.Short)
                            .setMaxLength(100)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("betrag")
                            .setLabel("Geldstrafe in $ (0 = keine)")
                            .setStyle(TextInputStyle.Short)
                            .setValue("0")
                            .setMaxLength(12)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("strikes")
                            .setLabel(`Strikes (0-${config.maxStrikes})`)
                            .setStyle(TextInputStyle.Short)
                            .setValue("0")
                            .setMaxLength(1)
                            .setRequired(true)
                    )
                );

            return interaction.showModal(modal);
        }

        if (aktion === "anpassen") {

            const s = berechneSumme(e);

            const modal = new ModalBuilder()
                .setCustomId(`sanktion_modal|anpassen|${token}`)
                .setTitle("Strikes & Betrag anpassen")
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("strikes")
                            .setLabel(`Strikes (Vorschlag: ${s.vorschlagStrikes})`.slice(0, 45))
                            .setStyle(TextInputStyle.Short)
                            .setValue(String(s.strikes))
                            .setMaxLength(1)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("betrag")
                            .setLabel("Gesamtbetrag in $")
                            .setStyle(TextInputStyle.Short)
                            .setValue(String(s.betrag))
                            .setMaxLength(12)
                            .setRequired(true)
                    )
                );

            return interaction.showModal(modal);
        }

        return;
    }

    // ----- Modals -----
    if (interaction.isModalSubmit()) {

        const betrag = parseZahl(interaction.fields.getTextInputValue("betrag"));
        const strikes = parseZahl(interaction.fields.getTextInputValue("strikes"));

        if (Number.isNaN(betrag) || Number.isNaN(strikes) || strikes > config.maxStrikes) {
            return interaction.reply({
                content: `❌ Ungültige Eingabe. Betrag muss eine Zahl sein, Strikes zwischen 0 und ${config.maxStrikes}.`,
                ephemeral: true
            });
        }

        if (aktion === "eigene") {

            if (e.eigene.length >= MAX_EIGENE) {
                return interaction.reply({ content: `❌ Maximal ${MAX_EIGENE} eigene Sanktionen pro Vorgang.`, ephemeral: true });
            }

            e.eigene.push({
                titel: interaction.fields.getTextInputValue("titel").trim(),
                betrag,
                strikes
            });
            e.strikesOverride = null;
            e.betragOverride = null;

            return interaction.update(baueAnsicht(e));
        }

        if (aktion === "anpassen") {

            const items = berechneItems(e);
            const vorschlagBetrag = items.reduce((a, i) => a + i.betrag, 0);
            const vorschlagStrikes = items.reduce((a, i) => a + i.strikes, 0);

            e.betragOverride = betrag !== vorschlagBetrag ? betrag : null;
            e.strikesOverride = strikes !== vorschlagStrikes ? strikes : null;

            return interaction.update(baueAnsicht(e));
        }
    }
}


module.exports = {
    starteEntwurf,
    zeigeStrikes,
    handleKomponente,
    _test: { holeHistorie, berechneItems, berechneSumme, baueAnsicht, baueDM, kuendigeAutomatisch }
};
