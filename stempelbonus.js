const config = require("./config.js");

// Bonus nach eigenen Wochenstunden (gilt für Platz 1-3)
function bonusFuerMinuten(minuten) {

    const stunden = minuten / 60;

    for (const stufe of config.stempelBonus.stufen) {
        if (stunden >= stufe.abStunden) return stufe.betrag;
    }

    return config.stempelBonus.minimum;
}


// rangliste: [[name, minuten], ...] absteigend sortiert, max. 5 Einträge
// Rückgabe: Array mit dem Bonus pro Platz
function berechne(rangliste) {

    const c = config.stempelBonus;
    const runde = betrag => Math.floor(betrag / 1000) * 1000;

    const bonus = rangliste.map(([, minuten], i) =>
        i < 3 ? bonusFuerMinuten(minuten) : c.platz45Basis
    );

    if (rangliste.length > 3) {

        const minuten3 = rangliste[2][1];

        for (let i = 3; i < rangliste.length; i++) {

            const abstandZu3 = minuten3 - rangliste[i][1];
            const abstandVorher = rangliste[i - 1][1] - rangliste[i][1];

            if (abstandZu3 <= c.sehrNahMinuten) {

                // fast gleichauf mit Platz 3 -> knapp weniger als Platz 3
                bonus[i] = Math.max(c.platz45Basis, runde(bonus[2] * c.sehrNahAnteil));

            } else if (abstandVorher <= c.nahMinuten) {

                // dicht hinter dem Platz davor -> 100.000 $ (bei Platz 5 bekommt Platz 4 dann auch mindestens 100.000 $)
                bonus[i] = Math.max(bonus[i], c.nahBetrag);

                if (i - 1 >= 3) {
                    bonus[i - 1] = Math.max(bonus[i - 1], c.nahBetrag);
                }
            }
        }
    }

    return bonus;
}


module.exports = { bonusFuerMinuten, berechne };
