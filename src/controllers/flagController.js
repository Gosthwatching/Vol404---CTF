// Controleur flag: gere token temporaire et validation finale du flag.
const User = require('../models/User');
const { consumePhishToken } = require('../utils/phishQueue');

const airports = {
    94: "ORY",   // Val-de-Marne �?' Paris-Orly
    13: "MRS",   // Marseille
    69: "LYS",   // Lyon
    75: "CDG",   // Paris CDG
    31: "TLS",   // Toulouse
    67: "SXB"    // Strasbourg
};

const unlockFlagPage = (req, res) => {
    const token = String(req.body.token || '').trim();

    if (!token) {
        return res.status(400).json({ error: 'Token requis.' });
    }

    const phishResult = consumePhishToken({
        userId: req.session.user.id,
        token
    });

    if (!phishResult.ok) {
        return res.status(401).json({ error: 'Token invalide ou expire.' });
    }

    req.session.flagUnlocked = true;

    return res.json({ success: true, redirect: '/flag.html' });
};

const getFlagStatus = (req, res) => {
    return res.json({
        unlocked: Boolean(req.session.flagUnlocked),
        hasActiveToken: false,
        remainingSeconds: 0
    });
};

// POST /flag
const checkFlag = async (req, res) => {
    const dep = parseInt(req.body.code);

    if (!req.session?.flagUnlocked) {
        return res.status(403).json({ error: "Zone flag verrouillee. Token requis." });
    }

    if (!dep || !airports[dep]) {
        return res.status(400).json({ error: "Mauvaise réponse." });
    }

    // Marquer flagFound pour l'élève connecté
    if (req.session?.user) {
        await User.updateOne(
            { _id: req.session.user.id, 'progress.flagFound': { $ne: true } },
            { $set: { 'progress.flagFound': true, 'progress.flagFoundAt': new Date() } }
        );
    }

    return res.json({ flag: `CTF{${airports[dep]}_boarding_complete}` });
};

module.exports = { checkFlag, unlockFlagPage, getFlagStatus };

