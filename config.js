module.exports = {

    // Server (Guild) ID
    serverId: "1457890146753183918",

    // Rollen
    mitarbeiterRolle: "1482761223497056369",
    leitungRolle: "1489698355507499169",

    // Bürgerrolle: wird vom Bot NIEMALS entfernt oder verändert.
    bürgerRolle: "1458078659113128090",

    // Kanäle
    teamUpdateKanal: "1457892182793916427",
    bewerbungsKanal: "1457892159343558738",
    geburtstagsKanal: "1529748718360727634",
    ankuendigungsKanal: "1485668552772948091",
    teambesprechungKanal: "1490706705288396922",
    sanktionsKanal: "1489645535907549235",
    abmeldungKanal: "1483115051995889726",
    lottoKanal: "1528684680549761166",
    zitatKanal: "1531874677277065306",

    // Stempeluhr-Auswertung
    stempeluhrKanal: "1457892980814905579",
    stundenTop3Kanal: "1572310873207214090",
    nachtschichtKanal: "1493262902805921924",
    bewerbungsgespraecheKanal: "HIER_KANAL_ID_EINTRAGEN",

    // Bewerbungsphase-Bilder: Kanal + Nachrichten-ID, wo du die 2 Bilder hochgeladen hast.
    // Der Bot holt sich darüber jedes Mal einen frischen, gültigen Bild-Link
    // (die von dir kopierten CDN-Links laufen sonst nach ca. 24h ab).
    bewerbungsphaseBilderKanal: "1530138668755583027",
    bewerbungsphaseNachrichtOffenID: "1531642017635893420",
    bewerbungsphaseNachrichtGeschlossenID: "1531641821116240082",


    // Leitungsebene: alle Ränge von CEO bis Ausbildungsleitung (wird automatisch aus "rollen" gebaut, siehe unten)
    leitungsebeneRaenge: ["CEO", "Geschäftsleitung", "Personalleitung", "Ausbildungsleitung"],


    // Alle Diamond Taxi Ränge (Reihenfolge = Anzeige-Reihenfolge in der Teamliste, oben zuerst)
    rollen: {

        "CEO": "1457890985567846410",
        "Geschäftsleitung": "1457891019843436757",
        "Personalleitung": "1482761218832863352",
        "Ausbildungsleitung": "1482761216232525824",
        "Ausbilder": "1482761157784633436",
        "Elite Fahrer": "1482760987885965504",
        "Senior Fahrer": "1457891088085028928",
        "Diamond Fahrer": "1457891115700064427",
        "Taxi Fahrer": "1457891175129415822",
        "Diplomfahrer": "1457891223695130755",
        "Azubi": "1457891276505747610",
        "Praktikant": "1457892267099422762"

    },


    // ======================
    // Fahrtenbuch
    // ======================
    fahrtenbuch: {
        kanal: "1457893055729504289",              // hier postet /fahrtenbuch senden das Panel
        logKanal: "1572342391820783667",           // hier landet jede Fahrt (dient gleichzeitig als Speicher!)
        sonderzahlungKanal: "1572342480123461874", // Sonntag 15 Uhr: Rechnung, Sonntag 20 Uhr: Stempeluhr-Bonus

        bonus: { taxi: 3500, tour: 5000, limousine: 0, bus: 0 },   // Bonus pro Fahrt in $
        limoRichtpreise: { "30": 150000, "60": 250000 },           // Richtpreise Limousine
        abgabeAnteil: 0.85,                                        // 85 % der Limousinen-Einnahmen gehen an die Firma
        loeschFensterStunden: 8                                    // Fahrten dürfen nur so lange gelöscht werden
    },


    // ======================
    // Wöchentlicher Stempeluhr-Bonus (Top 5, Sonntag 20 Uhr)
    // ======================
    stempelBonus: {
        stufen: [                       // Platz 1-3: Bonus nach eigenen Wochenstunden (absteigend sortiert!)
            { abStunden: 100, betrag: 1000000 },
            { abStunden: 80, betrag: 700000 },
            { abStunden: 60, betrag: 500000 },
            { abStunden: 40, betrag: 300000 },
            { abStunden: 20, betrag: 150000 }
        ],
        minimum: 50000,                 // unter der letzten Stufe
        platz45Basis: 50000,            // Platz 4 und 5
        nahMinuten: 15,                 // höchstens so viele Minuten hinter dem Platz davor ...
        nahBetrag: 100000,              // ... = 100.000 $
        sehrNahMinuten: 10,             // höchstens so viele Minuten hinter Platz 3 ...
        sehrNahAnteil: 0.9              // ... = 90 % vom Bonus von Platz 3
    },


    // ======================
    // Strike-System
    // ======================
    maxStrikes: 3,          // bei diesem Stand: automatische Kündigung
    strikeAblaufTage: 30,   // Strikes laufen ab; so lange zählen auch frühere Verstöße für die Stufe


    // Sanktionskatalog
    // stufen[0] = 1. Verstoß, stufen[1] = 2. Verstoß usw. (innerhalb von strikeAblaufTage).
    // Gibt es mehr Verstöße als Stufen, gilt die letzte Stufe.
    // betrag = Geldstrafe in $, strikes = vorgeschlagene Strikes, kuendigung = löst Kündigung aus
    sanktionen: [

        { key: "abwesend_dienst", emoji: "⏳", name: "Abwesenheit im Dienst (>20 Min.)", stufen: [
            { betrag: 250000, strikes: 0, text: "Geldstrafe" },
            { betrag: 400000, strikes: 0, text: "Geldstrafe" },
            { betrag: 0, strikes: 1, text: "wiederholt/absichtlich" }
        ] },

        { key: "abwesend_vom_dienst", emoji: "⏳", name: "Abwesenheit vom Dienst (keine Abmeldung)", stufen: [
            { betrag: 150000, strikes: 0, text: "nach 3 Tagen" },
            { betrag: 150000, strikes: 0, text: "nach 6 Tagen, +150.000 $" },
            { betrag: 0, strikes: 0, text: "nach 10 Tagen", kuendigung: true }
        ] },

        { key: "funk", emoji: "📻", name: "Abwesenheit im Funk / Funkpflicht", stufen: [
            { betrag: 100000, strikes: 0, text: "Geldstrafe" },
            { betrag: 200000, strikes: 0, text: "Geldstrafe" },
            { betrag: 400000, strikes: 1, text: "Geldstrafe + Strike" }
        ] },

        { key: "gps", emoji: "📍", name: "Verletzung der GPS-Pflicht", stufen: [
            { betrag: 100000, strikes: 0, text: "Geldstrafe" }
        ] },

        { key: "paycheck", emoji: "💸", name: "Paycheck Farming", stufen: [
            { betrag: 250000, strikes: 1, text: "Geldstrafe + Strike" },
            { betrag: 750000, strikes: 2, text: "Geldstrafe + 2 Strikes" }
        ] },

        { key: "illegal", emoji: "❗", name: "Illegale Gegenstände / Waffen", stufen: [
            { betrag: 1000000, strikes: 1, text: "schwerer Verstoß" }
        ] },

        { key: "taser", emoji: "⚡", name: "Taser-Missbrauch", stufen: [
            { betrag: 500000, strikes: 0, text: "Geldstrafe" },
            { betrag: 1000000, strikes: 1, text: "schwer/wiederholt" }
        ] },

        { key: "kleidung", emoji: "👕", name: "Dienstkleidung", stufen: [
            { betrag: 0, strikes: 0, text: "Verwarnung" },
            { betrag: 100000, strikes: 0, text: "Geldstrafe" },
            { betrag: 250000, strikes: 0, text: "Geldstrafe" }
        ] },

        { key: "diebstahl", emoji: "🔒", name: "Diebstahl / Unterschlagung", stufen: [
            { betrag: 1000000, strikes: 1, text: "je nach Umfang bis 1 Mio." },
            { betrag: 1000000, strikes: 2, text: "schwerer Verstoß" }
        ] },

        { key: "verhalten", emoji: "🗣️", name: "Verhalten ggü. Kunden/Mitarbeitern", stufen: [
            { betrag: 0, strikes: 0, text: "Verwarnung" },
            { betrag: 500000, strikes: 1, text: "Geldstrafe + Strike" },
            { betrag: 0, strikes: 0, text: "Kündigung", kuendigung: true }
        ] },

        { key: "intern", emoji: "🤫", name: "Interne Informationen weitergegeben", stufen: [
            { betrag: 0, strikes: 0, text: "leicht: Verwarnung/Geldstrafe" },
            { betrag: 1000000, strikes: 1, text: "schwerer Verstoß" },
            { betrag: 0, strikes: 2, text: "besonders schwer" }
        ] },

        { key: "eigentum", emoji: "🚗", name: "Missbrauch von Firmeneigentum", stufen: [
            { betrag: 250000, strikes: 0, text: "Geldstrafe" },
            { betrag: 750000, strikes: 0, text: "Geldstrafe" },
            { betrag: 0, strikes: 1, text: "schwer/wiederholt" }
        ] },

        { key: "stehen_lassen", emoji: "🚗", name: "Firmenwagen stehen lassen", stufen: [
            { betrag: 0, strikes: 0, text: "Verwarnung" },
            { betrag: 100000, strikes: 0, text: "Geldstrafe" },
            { betrag: 600000, strikes: 1, text: "Geldstrafe + Strike" }
        ] },

        { key: "offen_lassen", emoji: "🚗", name: "Firmenfahrzeug offen lassen", stufen: [
            { betrag: 0, strikes: 0, text: "Verwarnung" },
            { betrag: 300000, strikes: 0, text: "Geldstrafe" },
            { betrag: 0, strikes: 1, text: "schwer/wiederholt" }
        ] },

        { key: "tuev", emoji: "🚗", name: "TÜV nicht beachtet", stufen: [
            { betrag: 0, strikes: 0, text: "Verwarnung" },
            { betrag: 250000, strikes: 0, text: "Geldstrafe" },
            { betrag: 500000, strikes: 0, text: "Geldstrafe" }
        ] },

        { key: "ausstempeln", emoji: "⏹️", name: "Dienst verlassen ohne Auszustempeln", stufen: [
            { betrag: 0, strikes: 0, text: "Hinweis/Verwarnung" },
            { betrag: 100000, strikes: 0, text: "wiederholt, 100.000-250.000 $" },
            { betrag: 250000, strikes: 0, text: "wiederholt" }
        ] },

        { key: "anweisung", emoji: "📣", name: "Missachtung von Anweisungen", stufen: [
            { betrag: 0, strikes: 0, text: "Verwarnung" },
            { betrag: 250000, strikes: 0, text: "Geldstrafe" },
            { betrag: 0, strikes: 1, text: "wiederholte/schwere Arbeitsverweigerung" }
        ] }

    ]

};


// Leitungsebene-IDs automatisch aus den Rängen oben ableiten
module.exports.leitungsebene = module.exports.leitungsebeneRaenge.map(name => module.exports.rollen[name]);
