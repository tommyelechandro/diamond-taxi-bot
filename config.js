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
    stundenTop3Kanal: "1505880432904765552",
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
    // WICHTIG: Bei "HIER_ROLLEN_ID_EINTRAGEN" die echte Discord-Rollen-ID einsetzen!
    rollen: {

        "CEO": "1457890985567846410",
        "Geschäftsleitung": "1457891019843436757",
        "Personalleitung": "1482761218832863352",
        "Ausbildungsleitung": "HIER_ROLLEN_ID_EINTRAGEN",
        "Ausbilder": "HIER_ROLLEN_ID_EINTRAGEN",
        "Elite Fahrer": "HIER_ROLLEN_ID_EINTRAGEN",
        "Senior Fahrer": "1457891115700064427",
        "Diamond Fahrer": "1482760987885965504",
        "Taxi Fahrer": "HIER_ROLLEN_ID_EINTRAGEN",
        "Diplomfahrer": "HIER_ROLLEN_ID_EINTRAGEN",
        "Azubi": "HIER_ROLLEN_ID_EINTRAGEN",
        "Praktikant": "1457892267099422762"

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
