// Controleur leaderboard: Calcule et expose le classement des participants.
const User = require('../models/User');
const Ticket = require('../models/Billet');

const FAKE_PLAYER_FILTER = {
    role: 'player',
    $or: [
        { seeded: true },
        { username: { $regex: /_af\d{3,4}$/i } }
    ]
};

// �?tapes CTF dans l'ordre chronologique
const STEPS = [
    { key: 'loggedIn',     label: 'Connexion' },
    { key: 'xssDone',      label: 'XSS' },
    { key: 'nosqlDone',    label: 'NoSQL Injection' },
    { key: 'logsAccessed', label: 'Logs admin' },
    { key: 'gatePassed',   label: 'Gate validé' },
    { key: 'puzzleUnlocked', label: 'Puzzle débloqué' },
    { key: 'puzzleDone',   label: 'Puzzle réussi' },
    { key: 'flagFound',    label: 'Flag trouvé' }
];

const normalizeProgress = (progress = {}) => ({
    loggedIn: Boolean(progress.loggedIn),
    xssDone: Boolean(progress.xssDone),
    nosqlDone: Boolean(progress.nosqlDone),
    logsAccessed: Boolean(progress.logsAccessed),
    gatePassed: Boolean(progress.gatePassed),
    puzzleUnlocked: Boolean(progress.puzzleUnlocked),
    puzzleDone: Boolean(progress.puzzleDone),
    flagFound: Boolean(progress.flagFound),
    flagFoundAt: progress.flagFoundAt || null
});

// Calcule un score (nombre d'étapes validées)
const scoreOf = (progress = {}) =>
    STEPS.filter(s => progress[s.key]).length;

const deleteUsersAndTickets = async (userIds = []) => {
    const ticketDeleteResult = userIds.length
        ? await Ticket.deleteMany({ userId: { $in: userIds } })
        : { deletedCount: 0 };

    const userDeleteResult = userIds.length
        ? await User.deleteMany({ _id: { $in: userIds } })
        : { deletedCount: 0 };

    return {
        usersDeleted: Number(userDeleteResult.deletedCount || 0),
        ticketsDeleted: Number(ticketDeleteResult.deletedCount || 0)
    };
};

// GET /admin/leaderboard
const getLeaderboard = async (req, res) => {
    const users = await User.find(
        {
            role: 'player',
            seeded: { $ne: true },
            username: { $not: /_af\d{3,4}$/i }
        },
        { username: 1, progress: 1, createdAt: 1 }
    ).lean();

    const ranked = users
        .map(u => {
            const progress = normalizeProgress(u.progress);
            if (progress.flagFound) {
                progress.loggedIn = true;
                progress.xssDone = true;
                progress.nosqlDone = true;
                progress.logsAccessed = true;
                progress.gatePassed = true;
                progress.puzzleUnlocked = true;
                progress.puzzleDone = true;
            }

            return {
                userId:      String(u._id),
                username:    u.username,
                score:       scoreOf(progress),
                registeredAt: u.createdAt,
                flagFoundAt: progress.flagFoundAt,
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

// POST /admin/cleanup-fake-users
const cleanupFakeUsers = async (req, res) => {
    const fakeUsers = await User.find(FAKE_PLAYER_FILTER, { _id: 1, username: 1 }).lean();
    const userIds = fakeUsers.map((user) => user._id);

    const deleteResult = await deleteUsersAndTickets(userIds);

    const remainingFakeUsers = await User.countDocuments(FAKE_PLAYER_FILTER);

    return res.json({
        success: true,
        found: fakeUsers.length,
        usersDeleted: deleteResult.usersDeleted,
        ticketsDeleted: deleteResult.ticketsDeleted,
        remainingFakeUsers
    });
};

// DELETE /admin/student/:userId
const deleteStudent = async (req, res) => {
    const { userId } = req.params;

    const user = await User.findOne({ _id: userId, role: 'player' }, { _id: 1, username: 1 }).lean();
    if (!user) {
        return res.status(404).json({ error: 'Eleve introuvable.' });
    }

    const deleteResult = await deleteUsersAndTickets([user._id]);

    return res.json({
        success: true,
        deletedUser: user.username,
        usersDeleted: deleteResult.usersDeleted,
        ticketsDeleted: deleteResult.ticketsDeleted
    });
};

// DELETE /admin/students
const deleteAllStudents = async (req, res) => {
    const students = await User.find({ role: 'player' }, { _id: 1 }).lean();
    const userIds = students.map((student) => student._id);
    const deleteResult = await deleteUsersAndTickets(userIds);

    return res.json({
        success: true,
        found: students.length,
        usersDeleted: deleteResult.usersDeleted,
        ticketsDeleted: deleteResult.ticketsDeleted
    });
};

module.exports = { getLeaderboard, cleanupFakeUsers, deleteStudent, deleteAllStudents };

