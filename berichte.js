const { EmbedBuilder } = require("discord.js");
const config = require("./config.js");
const fahrtenbuch = require("./fahrtenbuch.js");
const sanktionen = require("./sanktionen.js");

// ======================================================
// WOCHENBERICHT (Leitung), INAKTIVITÄTS-LISTE, FAHRER DER WOCHE
// Alle Funktionen laufen sonntags um 20 Uhr (siehe index.js)
// d = Helfer aus events.js: holeStempelNachrichten, parseStempelNachricht,
//     findeMitgliedNachName, montagDieserWoche
// ======================================================

const ARTEN = { taxi: "🚕", tour: "🗺️", limousine: "🎩", bus: "🚌" };


function formatBetrag(zahl) {
    return zahl.toLocaleString("de-DE") + " $";
}

function zeit(minuten) {
    return `${Math.floor(minuten / 60)}h ${minuten % 60}m`;
}

function kanalOK(id) {
    return id && id !== "HIER_KANAL_ID_EINTRAGEN";
}

function chunk(zeilen, max) {

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


// Wer ist aktuell abgemeldet? (aus der Abmeldeliste)
async function holeAbgemeldete(guild) {

    const ids = new Set();

    try {

        if (!kanalOK(config.abmeldungKanal)) return ids;

        const kanal = await guild.channels.fetch(config.abmeldungKanal);
        const nachrichten = await kanal.messages.fetch({ limit: 50 });

        const liste = nachrichten.find(m =>
            m.author.id === guild.client.user.id &&
            m.embeds[0]?.footer?.text === "diamond-taxi-abmeldeliste"
        );

        const jetzt = Math.floor(Date.now() / 1000);
        const text = liste?.embeds[0]?.fields[0]?.value || "";

        for (const zeileText of text.split("\n")) {
            const m = /^<@!?(\d+)>\s*-\s*<t:(\d+):d>\s*bis\s*<t:(\d+):d>/.exec(zeileText.trim());
            if (m && parseInt(m[2], 10) <= jetzt && parseInt(m[3], 10) > jetzt) ids.add(m[1]);
        }

    } catch (error) {
        console.error("Abmeldeliste konnte nicht gelesen werden:", error.message);
    }

    return ids;
}


async function posteWochenbericht(guild, d) {

    try {

        const berichtKanalId = config.berichte && config.berichte.kanal;
        if (!kanalOK(berichtKanalId) || !kanalOK(config.stempeluhrKanal)) return;

        const kanal = await guild.channels.fetch(berichtKanalId);

        const heuteString = new Date().toISOString().slice(0, 10);
        const markerText = `diamond-taxi-wochenbericht-${heuteString}`;

        const letzte = await kanal.messages.fetch({ limit: 10 });

        const schonGepostet = letzte.some(m =>
            m.author.id === guild.client.user.id &&
            m.embeds[0]?.footer?.text === markerText
        );

        if (schonGepostet) return;

        const montag = d.montagDieserWoche();
        const mindestMinuten = config.berichte.mindestStunden * 60;

        // ----- Stunden -----
        const stempelKanal = await guild.channels.fetch(config.stempeluhrKanal);
        const nachrichten = await d.holeStempelNachrichten(stempelKanal, montag);

        await guild.members.fetch();

        const minutenProMitglied = {};
        let gesamtMinuten = 0;

        for (const msg of nachrichten) {

            const info = d.parseStempelNachricht(msg.embeds[0]);
            if (!info || info.typ !== "aus" || info.arbeitszeitMinuten === null) continue;

            const mitglied = d.findeMitgliedNachName(guild, info.name);
            const key = mitglied ? mitglied.id : `name:${info.name}`;

            minutenProMitglied[key] = (minutenProMitglied[key] || 0) + info.arbeitszeitMinuten;
            gesamtMinuten += info.arbeitszeitMinuten;
        }

        const aktive = Object.values(minutenProMitglied).filter(min => min >= mindestMinuten).length;

        // ----- Fahrten -----
        let fahrtenText = "Fahrtenbuch nicht verfügbar.";

        try {

            await fahrtenbuch.lade(guild);

            const fahrten = fahrtenbuch.alleFahrten().filter(t => t.status !== "D" && t.ts >= montag.getTime());
            const proArt = { taxi: 0, tour: 0, limousine: 0, bus: 0 };
            let bonus = 0;

            for (const t of fahrten) {
                proArt[t.art]++;
                bonus += t.bonus;
            }

            fahrtenText =
                `**${fahrten.length}** Fahrten (${Object.entries(ARTEN).map(([k, e]) => `${e} ${proArt[k]}`).join(" · ")})\n` +
                `Bonus diese Woche: ${formatBetrag(bonus)}`;

        } catch (error) {
            console.error("Fahrten für Wochenbericht fehlgeschlagen:", error.message);
        }

        // ----- Sanktionen / Strikes -----
        let sanktionsText = "Sanktionen nicht verfügbar.";
        let strikesText = "Sanktionen nicht verfügbar.";

        try {

            const u = await sanktionen.holeUebersicht(guild);
            const jetzt = Math.floor(Date.now() / 1000);
            const summe = u.offen.reduce((a, s) => a + s.betrag, 0);
            const ueberfaellig = u.offen.filter(s => s.fristUnix && s.fristUnix < jetzt).length;

            sanktionsText = u.offen.length > 0
                ? `**${u.offen.length}** offen (${formatBetrag(summe)}), davon **${ueberfaellig}** überfällig`
                : "Keine offenen Sanktionen. ✅";

            const mitStrikes = Object.entries(u.strikes).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);

            strikesText = mitStrikes.length > 0
                ? mitStrikes.map(([uid, n]) => `<@${uid}> – ${Math.min(n, config.maxStrikes)}/${config.maxStrikes}`).join("\n").slice(0, 1024)
                : "Niemand hat aktive Strikes. ✅";

        } catch (error) {
            console.error("Sanktionen für Wochenbericht fehlgeschlagen:", error.message);
        }

        // ----- Inaktive -----
        const abgemeldet = await holeAbgemeldete(guild);
        const leitungIds = [config.leitungRolle, ...config.leitungsebene];
        const mitarbeiterRolle = guild.roles.cache.get(config.mitarbeiterRolle);

        const inaktive = mitarbeiterRolle
            ? [...mitarbeiterRolle.members.values()]
                .filter(m =>
                    !m.user.bot &&
                    !leitungIds.some(id => m.roles.cache.has(id)) &&
                    !abgemeldet.has(m.id)
                )
                .map(m => ({ id: m.id, minuten: minutenProMitglied[m.id] || 0 }))
                .filter(x => x.minuten < mindestMinuten)
                .sort((a, b) => a.minuten - b.minuten)
            : [];

        const embeds = [];

        embeds.push(new EmbedBuilder()
            .setTitle("📊 Wochenbericht – Diamond Taxi")
            .setColor(0x1abc9c)
            .setDescription(`Auswertung für die Woche ab <t:${Math.floor(montag.getTime() / 1000)}:D>`)
            .addFields(
                { name: "⏱️ Arbeitszeit", value: `Gesamt: **${zeit(gesamtMinuten)}**\nMitarbeiter mit mind. ${config.berichte.mindestStunden} Std.: **${aktive}**` },
                { name: "🚖 Fahrten", value: fahrtenText },
                { name: "⚖️ Sanktionen", value: sanktionsText },
                { name: "🚫 Aktive Strikes", value: strikesText }
            ));

        const inaktivZeilen = inaktive.map(x => `<@${x.id}> – ${zeit(x.minuten)}`);

        if (inaktivZeilen.length === 0) {

            embeds.push(new EmbedBuilder()
                .setTitle(`😴 Inaktive Mitarbeiter (unter ${config.berichte.mindestStunden} Std.)`)
                .setColor(0x2ecc71)
                .setDescription("Alle Mitarbeiter waren aktiv. 🎉"));

        } else {

            chunk(inaktivZeilen, 3800).forEach((block, i) => {
                embeds.push(new EmbedBuilder()
                    .setTitle(i === 0
                        ? `😴 Inaktive Mitarbeiter (unter ${config.berichte.mindestStunden} Std.) – ${inaktivZeilen.length}`
                        : "😴 Inaktive Mitarbeiter (Fortsetzung)")
                    .setColor(0xe67e22)
                    .setDescription(block));
            });

        }

        // Marker auf jedes Embed
        embeds.forEach(e => e.setFooter({ text: markerText }));

        embeds[embeds.length - 1].setTimestamp();

        for (let i = 0; i < embeds.length; i += 5) {
            await kanal.send({ embeds: embeds.slice(i, i + 5) });
        }

    } catch (error) {
        console.error("Wochenbericht fehlgeschlagen:", error.message);
    }
}


async function posteFahrerDerWoche(guild, d) {

    try {

        if (!kanalOK(config.stundenTop3Kanal)) return;

        const kanal = await guild.channels.fetch(config.stundenTop3Kanal);

        const heuteString = new Date().toISOString().slice(0, 10);
        const markerText = `diamond-taxi-fahrerderwoche-${heuteString}`;

        const letzte = await kanal.messages.fetch({ limit: 15 });

        const schonGepostet = letzte.some(m =>
            m.author.id === guild.client.user.id &&
            m.embeds[0]?.footer?.text === markerText
        );

        if (schonGepostet) return;

        await fahrtenbuch.lade(guild);

        const montag = d.montagDieserWoche();
        const fahrten = fahrtenbuch.alleFahrten().filter(t => t.status !== "D" && t.ts >= montag.getTime());

        const proUser = {};

        for (const t of fahrten) {

            if (!proUser[t.uid]) proUser[t.uid] = { gesamt: 0, taxi: 0, tour: 0, limousine: 0, bus: 0 };

            proUser[t.uid].gesamt++;
            proUser[t.uid][t.art]++;
        }

        const top = Object.entries(proUser).sort((a, b) => b[1].gesamt - a[1].gesamt).slice(0, 3);

        if (top.length === 0) return;

        const medaillen = ["🥇", "🥈", "🥉"];

        const embed = new EmbedBuilder()
            .setTitle("🚖 Top 3 – Fahrer der Woche")
            .setColor(0xf1c40f)
            .setDescription(
                top.map(([uid, u], i) =>
                    `${medaillen[i]} <@${uid}> – **${u.gesamt}** Fahrten ` +
                    `(${Object.entries(ARTEN).map(([k, e]) => `${e} ${u[k]}`).join(" · ")})`
                ).join("\n")
            )
            .setFooter({ text: markerText })
            .setTimestamp();

        await kanal.send({ embeds: [embed] });

    } catch (error) {
        console.error("Fahrer der Woche fehlgeschlagen:", error.message);
    }
}


module.exports = { posteWochenbericht, posteFahrerDerWoche };
