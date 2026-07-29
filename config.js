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

    // Banner-Bilder für die Bewerbungsphase-Anzeige.
    // Bild in einen Discord-Kanal hochladen, dann "Link kopieren" und hier einfügen.
    bewerbungsphaseBildOffen: "HIER_BILD_URL_EINTRAGEN",
    bewerbungsphaseBildGeschlossen: "HIER_BILD_URL_EINTRAGEN",


    // Leitungsebene Rollen
    leitungsebene: [
        "1482761216232525824",
        "1496235902069112883",
        "1482761218832863352",
        "1503135142535762010",
        "1457891019843436757",
        "1457890985567846410"
    ],


    // Alle Diamond Taxi Ränge
    rollen: {

        "Praktikant": "1457892267099422762",
        "Junior Fahrer": "1457891276505747610",
        "Fahrer": "1457891223695130755",
        "Erfahrener Fahrer": "1457891175129415822",
        "Senior Fahrer": "1457891115700064427",
        "Diamond Fahrer Azubi": "1457891088085028928",
        "Diamond Fahrer": "1482760987885965504",
        "Erweiterter Schutzfahrer": "1482761157784633436",
        "Rechtsanwalt": "1490089617855217664",
        "Leitstelle": "1482761216232525824",
        "Security": "1530980821425721584",
        "Security Chef": "1496235902069112883",
        "Personalleitung": "1482761218832863352",
        "Geschäftsleitung Airport": "1503135142535762010",
        "Geschäftsleitung": "1457891019843436757",
        "CEO": "1457890985567846410"

    },


    // Sanktionskatalog: Paragraph, Beschreibung, Betrag in $
    sanktionen: [
        { paragraph: 1, text: "Unentschuldigtes Fehlen", betrag: 50000 },
        { paragraph: 2, text: "Zu spätes oder fehlendes Abmelden (ab 3 Tagen)", betrag: 25000 },
        { paragraph: 3, text: "Nichtteilnahme an Pflicht-Events ohne Abmeldung", betrag: 50000 },
        { paragraph: 4, text: "Beleidigung oder respektloser Umgang mit Fahrgästen", betrag: 75000 },
        { paragraph: 5, text: "Beleidigung oder respektloser Umgang mit Mitarbeitern", betrag: 50000 },
        { paragraph: 6, text: "Beleidigung/Respektlosigkeit gegenüber Geschäftsführung, Personalleitung oder CEO", betrag: 100000 },
        { paragraph: 7, text: "Missachtung einer Anweisung der Geschäftsführung, Personalleitung oder des CEO", betrag: 75000 },
        { paragraph: 8, text: "Mehrfache Missachtung einer Anweisung der Geschäftsführung, Personalleitung oder des CEO", betrag: 150000 },
        { paragraph: 9, text: "Missachtung der GPS-Vorgaben im Dienst", betrag: 50000 },
        { paragraph: 10, text: "Nicht im Funk erreichbar", betrag: 25000 },
        { paragraph: 11, text: "Unangemessenes Verhalten im Dienst (Trolling, Provokationen etc.)", betrag: 50000 },
        { paragraph: 12, text: "Dienstfahrzeug beschädigt (selbst verschuldet)", betrag: 100000 },
        { paragraph: 13, text: "Dienstfahrzeug stehen lassen", betrag: 50000 },
        { paragraph: 14, text: "Missbrauch eines Dienstfahrzeugs", betrag: 150000 },
        { paragraph: 15, text: "Vorsätzliches Rammen oder gefährliches Fahren", betrag: 150000 },
        { paragraph: 16, text: "Fahrerflucht nach einem selbst verursachten Unfall", betrag: 100000 },
        { paragraph: 17, text: "Entziehung oder Flucht vor staatlichen Behörden während des Dienstes", betrag: 250000 },
        { paragraph: 18, text: "Besitz von illegalem Equipment während des Dienstes", betrag: 200000 },
        { paragraph: 19, text: "Nutzung von illegalem Equipment während des Dienstes", betrag: 250000 },
        { paragraph: 20, text: "Weitergabe interner Informationen", betrag: 150000 },
        { paragraph: 21, text: "Missbrauch von Unternehmensrechten oder Fahrzeugen", betrag: 200000 },
        { paragraph: 22, text: "Schädigung des Unternehmensimages", betrag: 150000 }
    ]

};
