const path = require("path");
const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const config = require("./config.js");
const syslog = require("./syslog.js");

// ======================================================
// ANTI-BOT-KANAL (Honeypot)
// Jede Nachricht (von Nicht-Bots) in diesem Kanal = sofortiger Bann.
// ======================================================

const ab = config.antiBot;


function istLeitung(member) {
    if (!member) return false;
    return member.roles.cache.has(config.leitungRolle) ||
        config.leitungsebene.some(id => member.roles.cache.has(id));
}


// /antibot senden
async function handleBefehl(interaction) {

    if (!istLeitung(interaction.member)) {
        return interaction.reply({ content: "❌ Das darf nur die Leitungsebene.", ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const kanal = await interaction.guild.channels.fetch(ab.kanal);

    const embed = new EmbedBuilder()
        .setTitle("⚠️ Anti-Bot · Hier nicht schreiben!")
        .setColor(0xe74c3c)
        .setDescription(
            "**Dieser Kanal ist eine Falle für gehackte Accounts und Scam-Bots.**\n" +
            "Wer hier eine Nachricht schreibt, wird **sofort und automatisch gebannt** – ohne Vorwarnung.\n\n" +
            "### Warum gibt es diesen Kanal?\n" +
            "Wird ein Discord-Account gehackt (Token-Grabber), spammt er Scam- und Phishing-Links in **jeden** Kanal, den er sehen kann. " +
            "Dieser Kanal hat für normale Nutzer keinen Zweck – jede Nachricht hier ist deshalb ein sicheres Zeichen für einen übernommenen Account.\n\n" +
            "### Was musst du tun?\n" +
            "**Nichts.** Schreib hier einfach nicht rein – auch kein „test“, kein Emoji, kein Sticker und kein Bild."
        )
        .setThumbnail("attachment://logo.png")
        .setFooter({ text: "Automatischer Schutz · Nachrichten in diesem Kanal führen zu einem sofortigen Bann." });

    await kanal.send({
        embeds: [embed],
        files: [new AttachmentBuilder(path.join(__dirname, "logo.png"), { name: "logo.png" })]
    });

    return interaction.editReply({ content: `✅ Anti-Bot-Hinweis wurde in <#${kanal.id}> gepostet.` });
}


// Wird für jede neue Nachricht aufgerufen. true = Nachricht wurde behandelt.
async function pruefeNachricht(message) {

    if (!message.guild || message.channelId !== ab.kanal) return false;
    if (message.author.bot || message.webhookId) return false;

    const guild = message.guild;
    const user = message.author;
    const inhalt = (message.content || "[kein Text – Anhang/Sticker]").slice(0, 500);

    // Vorher eine DM schicken (nach dem Bann geht das nicht mehr)
    try {
        await user.send(
            "🚫 **Du wurdest von Diamond Taxi gebannt.**\n" +
            "Du hast in den Anti-Bot-Kanal geschrieben. Dieser Kanal ist eine Falle für gehackte Accounts.\n" +
            "Wurde dein Account gehackt? Ändere sofort dein Passwort, melde dich überall ab und kontaktiere uns danach."
        );
    } catch (error) {
        // DMs deaktiviert – egal
    }

    let ergebnis = "✅ Gebannt";
    let farbe = 0xe74c3c;

    try {

        await guild.members.ban(user.id, {
            deleteMessageSeconds: Math.min(ab.nachrichtenLoeschenStunden * 3600, 604800),
            reason: "Anti-Bot-Kanal: Nachricht geschrieben (Verdacht auf gehackten Account)"
        });

    } catch (error) {

        ergebnis = `⚠️ Bann fehlgeschlagen: ${error.message}`;
        farbe = 0xf39c12;

        await message.delete().catch(() => {});

        syslog.log(guild, "Anti-Bot: Bann fehlgeschlagen",
            `<@${user.id}> (${user.tag}) hat im Anti-Bot-Kanal geschrieben, konnte aber nicht gebannt werden: ${error.message}\n` +
            `Bot-Rolle muss über der Rolle des Nutzers stehen und "Mitglieder sperren" haben.`);
    }

    try {

        const logKanal = await guild.channels.fetch(ab.logKanal);

        await logKanal.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle("🔨 Anti-Bot-Kanal – Auto-Bann")
                    .setColor(farbe)
                    .addFields(
                        { name: "Nutzer", value: `<@${user.id}> (${user.tag})`, inline: true },
                        { name: "ID", value: user.id, inline: true },
                        { name: "Ergebnis", value: ergebnis },
                        { name: "Nachricht", value: inhalt }
                    )
                    .setTimestamp()
            ]
        });

    } catch (error) {
        console.error("Ban-Log fehlgeschlagen:", error.message);
    }

    return true;
}


module.exports = { handleBefehl, pruefeNachricht };
