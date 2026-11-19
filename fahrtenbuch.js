const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");
const config = require("./config.js");

// ======================================================
// FAHRTENBUCH
//
// Keine externe Datenbank nötig: Jede Fahrt ist eine Embed-Nachricht im
// Fahrtenbuch-Logs-Kanal. Der Footer enthält die Daten:
//   diamond-taxi-fahrt|<userId>|<art>|<ts>|<bonus>|<preis>|<abgabe>|<O|P|D>
//   O = offen, P = bezahlt, D = gelöscht
// Beim Start liest der Bot alle diese Nachrichten in den Speicher ein.
// Änderungen (bezahlt/gelöscht) werden in die Nachricht zurückgeschrieben.
// ======================================================

const fb = config.fahrtenbuch;
const STUNDE_MS = 60 * 60 * 1000;
const SEITENGROESSE = 10;

const ARTEN = {
    taxi: { label: "Taxifahrt", emoji: "🚕", farbe: 0xf1c40f },
    tour: { label: "Tour", emoji: "🗺️", farbe: 0x3498db },
    limousine: { label: "Limousinenfahrt", emoji: "🎩", farbe: 0x9b59b6 },
    bus: { label: "Busfahrt", emoji: "🚌", farbe: 0x1abc9c }
};

const FOOTER_REGEX = /^diamond-taxi-fahrt\|(\d+)\|(taxi|tour|limousine|bus)\|(\d+)\|(\d+)\|(\d+)\|(\d+)\|([OPD])$/;

let cache = new Map();
let ladePromise = null;


// ---------- Helfer ----------

function formatBetrag(zahl) {
    return zahl.toLocaleString("de-DE") + " $";
}

function datumKurz(ts) {
    return new Date(ts).toLocaleString("de-DE", {
        timeZone: "Europe/Berlin",
        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
    });
}

function anteilProzent() {
    return Math.round(fb.abgabeAnteil * 100);
}

function istLeitung(member) {
    if (!member) return false;
    return member.roles.cache.has(config.leitungRolle) ||
        config.leitungsebene.some(id => member.roles.cache.has(id));
}

function kanalOK(id) {
    return id && id !== "HIER_KANAL_ID_EINTRAGEN";
}

function zeile(row) {
    return new ActionRowBuilder().addComponents(row);
}

function parseZahl(wert) {
    const ziffern = String(wert).replace(/[^0-9]/g, "");
    return ziffern ? parseInt(ziffern, 10) : NaN;
}


// ---------- Fahrt <-> Embed ----------

function baueTripEmbed(t) {

    const art = ARTEN[t.art];

    const titel = t.status === "D" ? "🗑️ Fahrt gelöscht" : `${art.emoji} ${art.label}`;
    const farbe = t.status === "D" ? 0x7f8c8d : (t.status === "P" ? 0x2ecc71 : art.farbe);

    const felder = [
        { name: "Fahrer", value: `<@${t.uid}>`, inline: true },
        { name: "Art", value: art.label, inline: true },
        { name: "Von", value: t.von },
        { name: "Nach", value: t.nach }
    ];

    if (t.art === "limousine") {
        felder.push(
            { name: "Dauer", value: t.dauer || "-", inline: true },
            { name: "Erhalten", value: formatBetrag(t.preis), inline: true },
            { name: `Abgabe an Firma (${anteilProzent()} %)`, value: formatBetrag(t.abgabe), inline: true },
            { name: `Fahrer behält (${100 - anteilProzent()} %)`, value: formatBetrag(t.preis - t.abgabe), inline: true }
        );
    } else {
        felder.push({ name: "Bonus", value: t.bonus > 0 ? formatBetrag(t.bonus) : "kein Bonus", inline: true });
    }

    felder.push({
        name: "Status",
        value: t.status === "D" ? "🗑️ Gelöscht" : (t.status === "P" ? "🟢 Bezahlt" : "⚪ Offen")
    });

    return new EmbedBuilder()
        .setTitle(titel)
        .setColor(farbe)
        .addFields(felder)
        .setFooter({ text: `diamond-taxi-fahrt|${t.uid}|${t.art}|${t.ts}|${t.bonus}|${t.preis}|${t.abgabe}|${t.status}` })
        .setTimestamp(new Date(t.ts));
}


function parseTrip(msg) {

    const embed = msg.embeds[0];
    const m = FOOTER_REGEX.exec(embed?.footer?.text || "");
    if (!m) return null;

    const feld = name => embed.fields.find(f => f.name === name)?.value || "";

    return {
        id: msg.id,
        uid: m[1],
        art: m[2],
        ts: parseInt(m[3], 10),
        bonus: parseInt(m[4], 10),
        preis: parseInt(m[5], 10),
        abgabe: parseInt(m[6], 10),
        status: m[7],
        von: feld("Von"),
        nach: feld("Nach"),
        dauer: feld("Dauer")
    };
}


// ---------- Laden / Zugriff ----------

function lade(guild) {

    if (ladePromise) return ladePromise;

    ladePromise = (async () => {

        const kanal = await guild.channels.fetch(fb.logKanal);
        const neu = new Map();
        let vorId;

        while (true) {

            const optionen = { limit: 100 };
            if (vorId) optionen.before = vorId;

            const batch = await kanal.messages.fetch(optionen);
            if (batch.size === 0) break;

            for (const msg of batch.values()) {

                if (msg.author.id !== guild.client.user.id) continue;

                const trip = parseTrip(msg);
                if (trip) neu.set(trip.id, trip);
            }

            vorId = batch.last().id;
            if (batch.size < 100) break;
        }

        cache = neu;
        console.log(`Fahrtenbuch geladen: ${cache.size} Fahrten`);

    })().catch(error => {
        ladePromise = null;
        throw error;
    });

    return ladePromise;
}


// Alle nicht gelöschten Fahrten eines Mitarbeiters, älteste zuerst
function meineFahrten(uid) {
    return [...cache.values()]
        .filter(t => t.uid === uid && t.status !== "D")
        .sort((a, b) => a.ts - b.ts);
}

function loeschbareFahrten(uid) {
    const grenze = Date.now() - fb.loeschFensterStunden * STUNDE_MS;
    return meineFahrten(uid)
        .filter(t => t.status === "O" && t.ts >= grenze)
        .reverse();
}

async function schreibeTrip(guild, trip) {

    try {
        const kanal = await guild.channels.fetch(fb.logKanal);
        const msg = await kanal.messages.fetch(trip.id);
        await msg.edit({ embeds: [baueTripEmbed(trip)] });
    } catch (error) {
        console.error("Fahrt konnte nicht aktualisiert werden:", error.message);
    }
}

async function sendeLog(guild, embed) {

    try {
        const kanal = await guild.channels.fetch(fb.logKanal);
        await kanal.send({ embeds: [embed] });
    } catch (error) {
        console.error("Log-Nachricht fehlgeschlagen:", error.message);
    }
}


// ---------- Anzeige ----------

function tripZeile(t, nr) {

    const status = t.status === "P" ? "🟢" : "⚪";
    const ts = Math.floor(t.ts / 1000);

    const info = t.art === "limousine"
        ? `erhalten ${formatBetrag(t.preis)}, Abgabe ${formatBetrag(t.abgabe)}`
        : (t.bonus > 0 ? `+${formatBetrag(t.bonus)}` : "kein Bonus");

    return `${status} **#${nr}** ${ARTEN[t.art].emoji} <t:${ts}:d> <t:${ts}:t> · ${t.von} → ${t.nach} · ${info}`;
}


function summiere(trips) {

    const s = {
        anzahl: trips.length,
        proArt: { taxi: 0, tour: 0, limousine: 0, bus: 0 },
        offen: 0, bezahlt: 0,
        bonusOffen: 0, bonusBezahlt: 0,
        abgabeOffen: 0, abgabeBezahlt: 0
    };

    for (const t of trips) {
        s.proArt[t.art]++;
        if (t.status === "P") {
            s.bezahlt++; s.bonusBezahlt += t.bonus; s.abgabeBezahlt += t.abgabe;
        } else {
            s.offen++; s.bonusOffen += t.bonus; s.abgabeOffen += t.abgabe;
        }
    }

    return s;
}


function baueBilanz(uid, seite) {

    const alle = meineFahrten(uid);
    const s = summiere(alle);

    const seiten = Math.max(1, Math.ceil(alle.length / SEITENGROESSE));
    seite = Math.min(Math.max(seite, 0), seiten - 1);

    // neueste zuerst; Nummer = laufende Nummer seit der ersten Fahrt
    const neueste = alle.map((t, i) => ({ t, nr: i + 1 })).reverse();
    const ausschnitt = neueste.slice(seite * SEITENGROESSE, (seite + 1) * SEITENGROESSE);

    const embed = new EmbedBuilder()
        .setTitle("📊 Deine Fahrten – Gesamtbilanz")
        .setColor(0x3498db)
        .setDescription(
            alle.length > 0
                ? ausschnitt.map(({ t, nr }) => tripZeile(t, nr)).join("\n")
                : "Du hast noch keine Fahrten eingetragen."
        )
        .addFields(
            {
                name: "Fahrten gesamt",
                value:
                    `**${s.anzahl}** (🚕 ${s.proArt.taxi} · 🗺️ ${s.proArt.tour} · 🎩 ${s.proArt.limousine} · 🚌 ${s.proArt.bus})\n` +
                    `🟢 bezahlt: ${s.bezahlt} · ⚪ offen: ${s.offen}`
            },
            {
                name: "Bonus",
                value: `Noch offen: **${formatBetrag(s.bonusOffen)}**\nBereits bezahlt: ${formatBetrag(s.bonusBezahlt)}`,
                inline: true
            },
            {
                name: "Abgabe an die Firma",
                value: `Noch offen: **${formatBetrag(s.abgabeOffen)}**\nBereits erledigt: ${formatBetrag(s.abgabeBezahlt)}`,
                inline: true
            }
        )
        .setFooter({ text: `Seite ${seite + 1}/${seiten}` });

    const buttons = zeile([
        new ButtonBuilder()
            .setCustomId(`fb_seite|${uid}|${seite - 1}`)
            .setLabel("Zurück").setEmoji("◀️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(seite <= 0),
        new ButtonBuilder()
            .setCustomId(`fb_seite|${uid}|${seite + 1}`)
            .setLabel("Weiter").setEmoji("▶️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(seite >= seiten - 1)
    ]);

    return { embeds: [embed], components: [buttons] };
}


function baueHauptPanel() {

    const embed = new EmbedBuilder()
        .setTitle("🚖💎 Diamond Taxi – Fahrtenbuch")
        .setColor(0x1abc9c)
        .setDescription(
            "Trage hier jede Fahrt ein, die du gefahren hast.\n\n" +
            `🚕 **Taxifahrt:** ${formatBetrag(fb.bonus.taxi)} Bonus\n` +
            `🗺️ **Tour:** ${formatBetrag(fb.bonus.tour)} Bonus\n` +
            `🎩 **Limousine:** kein Bonus – ${anteilProzent()} % des Preises gehen an die Firma, ${100 - anteilProzent()} % darfst du behalten\n` +
            `🚌 **Bus:** kein Bonus\n\n` +
            `🟢 = bezahlt · ⚪ = noch offen\n` +
            `Löschen kannst du nur eigene, unbezahlte Fahrten der letzten ${fb.loeschFensterStunden} Stunden.`
        );

    const buttons = zeile([
        new ButtonBuilder().setCustomId("fb_add").setLabel("Fahrt hinzufügen").setEmoji("➕").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("fb_dellast").setLabel("Letzte löschen").setEmoji("🗑️").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("fb_delpick").setLabel("Fahrt auswählen & löschen").setEmoji("🧹").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("fb_last5").setLabel("Letzte 5 Fahrten").setEmoji("📋").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("fb_bilanz").setLabel("Gesamtbilanz").setEmoji("📊").setStyle(ButtonStyle.Primary)
    ]);

    return { embeds: [embed], components: [buttons] };
}


// ---------- Fahrt hinzufügen ----------

function artMenu() {
    return new StringSelectMenuBuilder()
        .setCustomId("fb_art")
        .setPlaceholder("Art der Fahrt wählen")
        .addOptions(Object.entries(ARTEN).map(([key, a]) => ({
            label: a.label, value: key, emoji: a.emoji
        })));
}

function dauerMenu() {
    return new StringSelectMenuBuilder()
        .setCustomId("fb_dauer")
        .setPlaceholder("Dauer der Limousinenfahrt")
        .addOptions(
            { label: `30 Minuten – Richtpreis ${formatBetrag(fb.limoRichtpreise["30"])}`, value: "30" },
            { label: `1 Stunde – Richtpreis ${formatBetrag(fb.limoRichtpreise["60"])}`, value: "60" },
            { label: "Länger / anderer Preis", value: "x" }
        );
}

function dauerText(key) {
    if (key === "30") return `30 Minuten (Richtpreis ${formatBetrag(fb.limoRichtpreise["30"])})`;
    if (key === "60") return `1 Stunde (Richtpreis ${formatBetrag(fb.limoRichtpreise["60"])})`;
    return "Länger / anderer Preis";
}

function baueModal(art, dauerKey) {

    const modal = new ModalBuilder()
        .setCustomId(`fb_modal|${art}|${dauerKey}`)
        .setTitle(`Neue ${ARTEN[art].label}`.slice(0, 45))
        .addComponents(
            zeile([
                new TextInputBuilder()
                    .setCustomId("von").setLabel("Von (Postleitzahl / Ort)")
                    .setStyle(TextInputStyle.Short).setMaxLength(50).setRequired(true)
            ]),
            zeile([
                new TextInputBuilder()
                    .setCustomId("nach").setLabel("Nach (Postleitzahl / Ort)")
                    .setStyle(TextInputStyle.Short).setMaxLength(50).setRequired(true)
            ])
        );

    if (art === "limousine") {

        const richt = fb.limoRichtpreise[dauerKey];

        const betrag = new TextInputBuilder()
            .setCustomId("betrag")
            .setLabel(richt ? `Erhalten in $ (Richtpreis ${formatBetrag(richt)})`.slice(0, 45) : "Erhaltener Betrag in $")
            .setStyle(TextInputStyle.Short)
            .setMaxLength(12)
            .setRequired(true);

        if (richt) betrag.setValue(String(richt));

        modal.addComponents(zeile([betrag]));
    }

    return modal;
}


async function erstelleFahrt(guild, uid, art, dauerKey, von, nach, preis) {

    await lade(guild);

    const trip = {
        id: null,
        uid,
        art,
        ts: Date.now(),
        bonus: fb.bonus[art] || 0,
        preis: art === "limousine" ? preis : 0,
        abgabe: art === "limousine" ? Math.round(preis * fb.abgabeAnteil) : 0,
        status: "O",
        von,
        nach,
        dauer: art === "limousine" ? dauerText(dauerKey) : ""
    };

    const kanal = await guild.channels.fetch(fb.logKanal);
    const msg = await kanal.send({ embeds: [baueTripEmbed(trip)] });

    trip.id = msg.id;
    cache.set(trip.id, trip);

    return trip;
}


// ---------- Löschen ----------

async function loescheFahrt(guild, trip, ausfuehrender) {

    trip.status = "D";
    await schreibeTrip(guild, trip);

    await sendeLog(guild, new EmbedBuilder()
        .setTitle("🗑️ Fahrt gelöscht")
        .setColor(0xe74c3c)
        .addFields(
            { name: "Fahrer", value: `<@${trip.uid}>`, inline: true },
            { name: "Gelöscht von", value: `<@${ausfuehrender}>`, inline: true },
            { name: "Fahrt", value: `${ARTEN[trip.art].emoji} ${ARTEN[trip.art].label}: ${trip.von} → ${trip.nach} (${datumKurz(trip.ts)})` }
        )
        .setFooter({ text: "diamond-taxi-fahrt-log" })
        .setTimestamp());
}


// ---------- Bezahlt ----------

async function markiereBezahlt(guild, trips, bestaetigtVon) {

    const s = { anzahl: trips.length, bonus: 0, abgabe: 0 };

    for (const t of trips) {
        t.status = "P";
        s.bonus += t.bonus;
        s.abgabe += t.abgabe;
        await schreibeTrip(guild, t);
    }

    if (trips.length === 0) return s;

    const uid = trips[0].uid;

    await sendeLog(guild, new EmbedBuilder()
        .setTitle("💸 Fahrten bezahlt")
        .setColor(0x2ecc71)
        .addFields(
            { name: "Mitarbeiter", value: `<@${uid}>`, inline: true },
            { name: "Fahrten", value: String(s.anzahl), inline: true },
            { name: "Bonus ausgezahlt", value: formatBetrag(s.bonus), inline: true },
            { name: "Abgabe an Firma verbucht", value: formatBetrag(s.abgabe), inline: true },
            { name: "Bestätigt von", value: `<@${bestaetigtVon}>`, inline: true }
        )
        .setFooter({ text: "diamond-taxi-fahrt-log" })
        .setTimestamp());

    try {
        const user = await guild.client.users.fetch(uid);
        await user.send(
            `✅ **Fahrtenbuch abgerechnet**\n` +
            `${s.anzahl} Fahrt(en) wurden als bezahlt markiert.\n` +
            `Bonus ausgezahlt: **${formatBetrag(s.bonus)}**\n` +
            `Abgabe an die Firma verbucht: **${formatBetrag(s.abgabe)}**`
        );
    } catch (error) {
        console.error("Bezahlt-DM fehlgeschlagen:", error.message);
    }

    return s;
}


// ---------- Slash-Befehle ----------

async function handleBefehl(interaction) {

    if (!istLeitung(interaction.member)) {
        return interaction.reply({ content: "❌ Das darf nur die Leitungsebene.", ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === "senden") {

        if (!kanalOK(fb.kanal)) {
            return interaction.reply({ content: "❌ Kein Fahrtenbuch-Kanal in config.js eingetragen.", ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        const kanal = await interaction.guild.channels.fetch(fb.kanal);
        await kanal.send(baueHauptPanel());

        return interaction.editReply({ content: `✅ Fahrtenbuch-Panel wurde in <#${kanal.id}> gesendet.` });
    }

    if (sub === "bezahlt") {

        const ziel = interaction.options.getUser("mitarbeiter");
        const modus = interaction.options.getString("modus") || "alles";

        await interaction.deferReply({ ephemeral: true });
        await lade(interaction.guild);

        const offen = meineFahrten(ziel.id).filter(t => t.status === "O");

        if (offen.length === 0) {
            return interaction.editReply({ content: `ℹ️ <@${ziel.id}> hat keine offenen Fahrten.` });
        }

        if (modus === "alles") {

            const s = await markiereBezahlt(interaction.guild, offen, interaction.user.id);

            return interaction.editReply({
                content:
                    `✅ ${s.anzahl} Fahrt(en) von <@${ziel.id}> als bezahlt markiert.\n` +
                    `Bonus: ${formatBetrag(s.bonus)} · Abgabe an Firma: ${formatBetrag(s.abgabe)}`
            });
        }

        // manuell auswählen: älteste 25 offene Fahrten
        const auswahl = offen.slice(0, 25);
        const alle = meineFahrten(ziel.id);

        const menu = new StringSelectMenuBuilder()
            .setCustomId(`fb_paysel|${ziel.id}`)
            .setPlaceholder("Fahrten auswählen, die bezahlt wurden")
            .setMinValues(1)
            .setMaxValues(auswahl.length)
            .addOptions(auswahl.map(t => ({
                label: `#${alle.indexOf(t) + 1} ${ARTEN[t.art].emoji} ${datumKurz(t.ts)} · ${t.von} → ${t.nach}`.slice(0, 100),
                description: (t.art === "limousine"
                    ? `Abgabe ${formatBetrag(t.abgabe)}`
                    : (t.bonus > 0 ? `Bonus ${formatBetrag(t.bonus)}` : "kein Bonus")).slice(0, 100),
                value: t.id
            })));

        return interaction.editReply({
            content:
                `Welche Fahrten von <@${ziel.id}> wurden bezahlt?` +
                (offen.length > 25 ? `\n(Es sind ${offen.length} offen – angezeigt werden die ältesten 25.)` : ""),
            components: [zeile([menu])]
        });
    }
}


// ---------- Buttons / Menüs / Modals ----------

async function handleKomponente(interaction) {

    const id = interaction.customId;
    const guild = interaction.guild;
    const uid = interaction.user.id;

    // ----- Modal: Fahrt speichern -----
    if (interaction.isModalSubmit() && id.startsWith("fb_modal|")) {

        const [, art, dauerKey] = id.split("|");

        const von = interaction.fields.getTextInputValue("von").trim();
        const nach = interaction.fields.getTextInputValue("nach").trim();

        let preis = 0;

        if (art === "limousine") {

            preis = parseZahl(interaction.fields.getTextInputValue("betrag"));

            if (Number.isNaN(preis) || preis <= 0) {
                return interaction.reply({ content: "❌ Bitte gib den erhaltenen Betrag als Zahl an.", ephemeral: true });
            }
        }

        if (interaction.isFromMessage()) {
            await interaction.deferUpdate();
        } else {
            await interaction.deferReply({ ephemeral: true });
        }

        const trip = await erstelleFahrt(guild, uid, art, dauerKey, von, nach, preis);

        let text = `✅ ${ARTEN[art].emoji} ${ARTEN[art].label} eingetragen: ${von} → ${nach}\n`;

        if (art === "limousine") {
            text +=
                `Erhalten: **${formatBetrag(trip.preis)}**\n` +
                `➡️ Du musst **${formatBetrag(trip.abgabe)}** (${anteilProzent()} %) an die Firma abgeben. ` +
                `Du behältst **${formatBetrag(trip.preis - trip.abgabe)}** (${100 - anteilProzent()} %).`;
        } else if (trip.bonus > 0) {
            text += `Bonus: **${formatBetrag(trip.bonus)}**`;
        } else {
            text += "Für diese Fahrtart gibt es keinen Bonus.";
        }

        return interaction.editReply({ content: text, components: [] });
    }

    // ----- Buttons -----
    if (interaction.isButton()) {

        if (id === "fb_add") {
            return interaction.reply({
                content: "Welche Art von Fahrt war das?",
                components: [zeile([artMenu()])],
                ephemeral: true
            });
        }

        if (id === "fb_last5") {

            await interaction.deferReply({ ephemeral: true });
            await lade(guild);

            const alle = meineFahrten(uid);
            const letzte = alle.map((t, i) => ({ t, nr: i + 1 })).slice(-5).reverse();

            const embed = new EmbedBuilder()
                .setTitle("📋 Deine letzten 5 Fahrten")
                .setColor(0x3498db)
                .setDescription(
                    letzte.length > 0
                        ? letzte.map(({ t, nr }) => tripZeile(t, nr)).join("\n")
                        : "Du hast noch keine Fahrten eingetragen."
                );

            return interaction.editReply({ embeds: [embed] });
        }

        if (id === "fb_bilanz") {

            await interaction.deferReply({ ephemeral: true });
            await lade(guild);

            return interaction.editReply(baueBilanz(uid, 0));
        }

        if (id.startsWith("fb_seite|")) {

            const [, ziel, seite] = id.split("|");

            if (ziel !== uid) {
                return interaction.reply({ content: "❌ Das ist nicht deine Übersicht.", ephemeral: true });
            }

            await interaction.deferUpdate();
            await lade(guild);

            return interaction.editReply(baueBilanz(uid, parseInt(seite, 10)));
        }

        if (id === "fb_dellast") {

            await interaction.deferReply({ ephemeral: true });
            await lade(guild);

            const letzte = loeschbareFahrten(uid)[0];

            if (!letzte) {
                return interaction.editReply({
                    content: `ℹ️ Keine löschbare Fahrt gefunden (nur eigene, unbezahlte Fahrten der letzten ${fb.loeschFensterStunden} Stunden).`
                });
            }

            return interaction.editReply({
                content: `Diese Fahrt wirklich löschen?\n${ARTEN[letzte.art].emoji} ${datumKurz(letzte.ts)} · ${letzte.von} → ${letzte.nach}`,
                components: [zeile([
                    new ButtonBuilder().setCustomId(`fb_delok|${letzte.id}`).setLabel("Ja, löschen").setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId("fb_delnein").setLabel("Abbrechen").setStyle(ButtonStyle.Secondary)
                ])]
            });
        }

        if (id === "fb_delnein") {
            return interaction.update({ content: "Abgebrochen.", components: [] });
        }

        if (id.startsWith("fb_delok|")) {

            const tripId = id.split("|")[1];

            await interaction.deferUpdate();
            await lade(guild);

            const trip = loeschbareFahrten(uid).find(t => t.id === tripId);

            if (!trip) {
                return interaction.editReply({ content: "❌ Diese Fahrt kann nicht mehr gelöscht werden.", components: [] });
            }

            await loescheFahrt(guild, trip, uid);

            return interaction.editReply({ content: "🗑️ Fahrt wurde gelöscht.", components: [] });
        }

        if (id === "fb_delpick") {

            await interaction.deferReply({ ephemeral: true });
            await lade(guild);

            const kandidaten = loeschbareFahrten(uid).slice(0, 25);

            if (kandidaten.length === 0) {
                return interaction.editReply({
                    content: `ℹ️ Keine löschbare Fahrt gefunden (nur eigene, unbezahlte Fahrten der letzten ${fb.loeschFensterStunden} Stunden).`
                });
            }

            const menu = new StringSelectMenuBuilder()
                .setCustomId("fb_delsel")
                .setPlaceholder("Fahrt zum Löschen auswählen")
                .addOptions(kandidaten.map(t => ({
                    label: `${ARTEN[t.art].emoji} ${t.von} → ${t.nach}`.slice(0, 100),
                    description: datumKurz(t.ts),
                    value: t.id
                })));

            return interaction.editReply({ content: "Welche Fahrt soll gelöscht werden?", components: [zeile([menu])] });
        }

        return;
    }

    // ----- Auswahlmenüs -----
    if (interaction.isStringSelectMenu()) {

        if (id === "fb_art") {

            const art = interaction.values[0];

            if (art === "limousine") {
                return interaction.update({ content: "Wie lange war die Limousinenfahrt?", components: [zeile([dauerMenu()])] });
            }

            return interaction.showModal(baueModal(art, "-"));
        }

        if (id === "fb_dauer") {
            return interaction.showModal(baueModal("limousine", interaction.values[0]));
        }

        if (id === "fb_delsel") {

            await interaction.deferUpdate();
            await lade(guild);

            const trip = loeschbareFahrten(uid).find(t => t.id === interaction.values[0]);

            if (!trip) {
                return interaction.editReply({ content: "❌ Diese Fahrt kann nicht mehr gelöscht werden.", components: [] });
            }

            await loescheFahrt(guild, trip, uid);

            return interaction.editReply({ content: "🗑️ Fahrt wurde gelöscht.", components: [] });
        }

        if (id.startsWith("fb_paysel|")) {

            if (!istLeitung(interaction.member)) {
                return interaction.reply({ content: "❌ Das darf nur die Leitungsebene.", ephemeral: true });
            }

            const ziel = id.split("|")[1];

            await interaction.deferUpdate();
            await lade(guild);

            const trips = interaction.values
                .map(tid => cache.get(tid))
                .filter(t => t && t.uid === ziel && t.status === "O");

            const s = await markiereBezahlt(guild, trips, uid);

            return interaction.editReply({
                content:
                    `✅ ${s.anzahl} Fahrt(en) von <@${ziel}> als bezahlt markiert.\n` +
                    `Bonus: ${formatBetrag(s.bonus)} · Abgabe an Firma: ${formatBetrag(s.abgabe)}`,
                components: []
            });
        }
    }
}


// ---------- Sonntags-Rechnung (15 Uhr) ----------

function chunkZeilen(zeilen, max) {

    const bloecke = [];
    let aktuell = "";

    for (const z of zeilen) {
        if (aktuell.length + z.length + 1 > max && aktuell) {
            bloecke.push(aktuell);
            aktuell = "";
        }
        aktuell += (aktuell ? "\n" : "") + z;
    }

    if (aktuell) bloecke.push(aktuell);

    return bloecke;
}


async function posteWochenRechnung(guild) {

    try {

        if (!kanalOK(fb.sonderzahlungKanal) || !kanalOK(fb.logKanal)) return;

        const kanal = await guild.channels.fetch(fb.sonderzahlungKanal);

        const heuteString = new Date().toISOString().slice(0, 10);
        const markerText = `diamond-taxi-fahrtenrechnung-${heuteString}`;

        const letzte = await kanal.messages.fetch({ limit: 15 });

        const schonGepostet = letzte.some(msg =>
            msg.author.id === guild.client.user.id &&
            msg.embeds[0]?.footer?.text === markerText
        );

        if (schonGepostet) return;

        await lade(guild);

        const offen = [...cache.values()].filter(t => t.status === "O").sort((a, b) => a.ts - b.ts);

        const proUser = {};

        for (const t of offen) {

            if (!proUser[t.uid]) proUser[t.uid] = { bonus: 0, abgabe: 0, fahrten: 0, taxi: 0, tour: 0, limos: [] };

            const u = proUser[t.uid];
            u.fahrten++;
            u.bonus += t.bonus;
            u.abgabe += t.abgabe;

            if (t.art === "taxi") u.taxi++;
            if (t.art === "tour") u.tour++;
            if (t.art === "limousine") u.limos.push(t);
        }

        const user = Object.entries(proUser);
        const gesamtBonus = user.reduce((a, [, u]) => a + u.bonus, 0);
        const gesamtAbgabe = user.reduce((a, [, u]) => a + u.abgabe, 0);

        const embeds = [];

        embeds.push(new EmbedBuilder()
            .setTitle("🧾 Fahrtenbuch – Wochenrechnung (offene Beträge)")
            .setColor(0x1abc9c)
            .setDescription(
                offen.length > 0
                    ? `Offene Fahrten: **${offen.length}**\n` +
                      `💸 Bonus, den wir noch zahlen müssen: **${formatBetrag(gesamtBonus)}**\n` +
                      `🎩 Abgaben, die Fahrer noch an die Firma schulden: **${formatBetrag(gesamtAbgabe)}**`
                    : "Es gibt keine offenen Fahrten. 🎉"
            ));

        // Teil 1: Bonus, den wir zahlen
        const bonusUser = user.filter(([, u]) => u.bonus > 0).sort((a, b) => b[1].bonus - a[1].bonus);

        if (bonusUser.length > 0) {

            const zeilen = bonusUser.map(([uid, u]) =>
                `<@${uid}> – 🚕 ${u.taxi} · 🗺️ ${u.tour} → **${formatBetrag(u.bonus)}**`
            );

            chunkZeilen(zeilen, 3800).forEach((block, i) => {
                embeds.push(new EmbedBuilder()
                    .setTitle(i === 0 ? "💸 Bonus – wir müssen zahlen" : "💸 Bonus (Fortsetzung)")
                    .setColor(0x2ecc71)
                    .setDescription(block));
            });
        }

        // Teil 2: Abgaben an die Firma (Limousine)
        const abgabeUser = user.filter(([, u]) => u.limos.length > 0).sort((a, b) => b[1].abgabe - a[1].abgabe);

        if (abgabeUser.length > 0) {

            const zeilen = [];

            for (const [uid, u] of abgabeUser) {

                zeilen.push(`**<@${uid}> schuldet ${formatBetrag(u.abgabe)}**`);

                for (const t of u.limos) {
                    zeilen.push(`└ ${datumKurz(t.ts)} · ${t.von} → ${t.nach} · erhalten ${formatBetrag(t.preis)} → Abgabe ${formatBetrag(t.abgabe)}`);
                }
            }

            chunkZeilen(zeilen, 3800).forEach((block, i) => {
                embeds.push(new EmbedBuilder()
                    .setTitle(i === 0 ? "🎩 Abgaben an die Firma (Limousine)" : "🎩 Abgaben (Fortsetzung)")
                    .setColor(0x9b59b6)
                    .setDescription(block));
            });
        }

        // Teil 3: überfällige Sanktionen
        try {

            const uebersicht = await require("./sanktionen.js").holeUebersicht(guild);
            const jetztUnix = Math.floor(Date.now() / 1000);
            const ueberfaellig = uebersicht.offen.filter(s => s.fristUnix && s.fristUnix < jetztUnix);

            if (ueberfaellig.length > 0) {

                const zeilen = ueberfaellig.map(s => `<@${s.uid}> – **${s.betragText}** (fällig seit <t:${s.fristUnix}:R>)`);

                chunkZeilen(zeilen, 3800).forEach((block, i) => {
                    embeds.push(new EmbedBuilder()
                        .setTitle(i === 0 ? "⚖️ Überfällige Sanktionen" : "⚖️ Überfällige Sanktionen (Fortsetzung)")
                        .setColor(0xe74c3c)
                        .setDescription(block));
                });
            }

        } catch (error) {
            console.error("Überfällige Sanktionen für Rechnung fehlgeschlagen:", error.message);
        }

        embeds[embeds.length - 1].setFooter({ text: markerText }).setTimestamp();

        // Marker muss auf JEDEM Embed stehen, damit die Doppelt-Prüfung greift
        for (let i = 0; i < embeds.length - 1; i++) {
            embeds[i].setFooter({ text: markerText });
        }

        for (let i = 0; i < embeds.length; i += 5) {
            await kanal.send({ embeds: embeds.slice(i, i + 5) });
        }

    } catch (error) {
        console.error("Fahrtenbuch-Wochenrechnung fehlgeschlagen:", error.message);
    }
}


module.exports = {
    lade,
    alleFahrten: () => [...cache.values()],
    handleBefehl,
    handleKomponente,
    posteWochenRechnung,
    _test: { parseTrip, baueTripEmbed, meineFahrten, summiere, tripZeile, getCache: () => cache }
};
