// Controleur leaderboard: Calcule et expose le classement des participants.
const User = require('../models/User');

// �?tapes CTF dans l'ordre chronologique
const STEPS = [
    { key: 'loggedIn',     label: 'Connexion' },
    { key: 'xssDone',      label: 'XSS' },
    { key: 'nosqlDone',    label: 'NoSQL Injection' },
    { key: 'logsAccessed', label: 'Logs admin' },
    { key: 'flagFound',    label: 'Flag trouvé' }
];

// Calcule un score (nombre d'étapes validées)
const scoreOf = (progress = {}) =>
    STEPS.filter(s => progress[s.key]).length;

// GET /admin/leaderboard
const getLeaderboard = async (req, res) => {
    const users = await User.find(
        { role: 'player', seeded: { $ne: true } },
        { username: 1, progress: 1, createdAt: 1 }
    ).lean();

    const ranked = users
        .map(u => {
            const progress = { ...(u.progress || {}) };
            if (progress.flagFound) {
                progress.loggedIn = true;
                progress.xssDone = true;
                progress.nosqlDone = true;
                progress.logsAccessed = true;
            }

            return {
                username:    u.username,
                score:       scoreOf(progress),
                registeredAt: u.createdAt,
                flagFoundAt: progress.flagFoundAt || null,
                steps: Object.fromEntries(
                    STEPS.map(s => [s.label, progress[s.key] ?? false])
                )
            };
        })
        .sort((a, b) => {
            // Tri : score décroissant, puis heure de flag croissante (premier arrivé)
            if (b.score !== a.score) return b.score - a.score;
            if (a.flagFoundAt && b.flagFoundAt) return new Date(a.flagFoundAt) - new Date(b.flagFoundAt);
            if (a.flagFoundAt) return -1;
            if (b.flagFoundAt) return 1;
            return 0;
        });

    return res.json({
        total: ranked.length,
        steps: STEPS.map(s => s.label),
        leaderboard: ranked.map((u, i) => ({ rank: i + 1, ...u }))
    });
};

module.exports = { getLeaderboard };

