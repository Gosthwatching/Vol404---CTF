const User = require('../models/User');

const getAttackProgress = (req) => {
    return req.session?.attackProgress || { xssDone: false, nosqlDone: false };
};

const buildPuzzleAccessStatus = async (req) => {
    const userId = req.session?.user?.id;

    if (!userId) {
        return {
            authenticated: false,
            ready: false,
            prerequisites: {
                xssDone: false,
                nosqlDone: false,
                logsAccessed: false,
                gatePassed: false
            }
        };
    }

    const attackProgress = getAttackProgress(req);
    const user = await User.findById(userId).select('progress');
    const dbProgress = user?.progress || {};

    const prerequisites = {
        xssDone: Boolean(dbProgress.xssDone || attackProgress.xssDone),
        nosqlDone: Boolean(dbProgress.nosqlDone || attackProgress.nosqlDone),
        logsAccessed: Boolean(dbProgress.logsAccessed),
        gatePassed: Boolean(dbProgress.gatePassed || req.session?.gatePassed)
    };

    const ready = Object.values(prerequisites).every(Boolean);

    return {
        authenticated: true,
        ready,
        prerequisites
    };
};

const wantsHtml = (req) => {
    const accept = String(req.headers.accept || '').toLowerCase();
    return accept.includes('text/html');
};

const requirePuzzleAccess = async (req, res, next) => {
    try {
        const status = await buildPuzzleAccessStatus(req);

        if (!status.authenticated) {
            if (wantsHtml(req)) {
                return res.redirect('/register.html');
            }
            return res.status(401).json({ error: 'Connexion requise.', ...status });
        }

        if (!status.ready) {
            if (wantsHtml(req)) {
                return res.redirect('/gate.html');
            }
            return res.status(403).json({
                error: 'Acces puzzle refuse: prerequis CTF incomplets.',
                ...status
            });
        }

        const userId = req.session?.user?.id;
        if (userId) {
            req.session.puzzleUnlocked = true;
            await User.updateOne(
                { _id: userId, 'progress.puzzleUnlocked': { $ne: true } },
                { $set: { 'progress.puzzleUnlocked': true } }
            );
        }

        return next();
    } catch (error) {
        return res.status(500).json({ error: 'Erreur interne de validation CTF.' });
    }
};

module.exports = {
    buildPuzzleAccessStatus,
    requirePuzzleAccess
};
