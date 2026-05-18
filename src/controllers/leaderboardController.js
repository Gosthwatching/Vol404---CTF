// Controleur leaderboard: calcule et expose le classement des participants.
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Ticket = require('../models/Billet');

const RESPONSES_FILE = path.join(__dirname, '../../questionnaire-responses.json');

const STEPS = [
    { key: 'loggedIn', label: 'Connexion' },
    { key: 'xssDone', label: 'XSS' },
    { key: 'nosqlDone', label: 'NoSQL Injection' },
    { key: 'logsAccessed', label: 'Logs admin' },
    { key: 'gatePassed', label: 'Gate validé' },
    { key: 'puzzleUnlocked', label: 'Puzzle débloqué' },
    { key: 'puzzleDone', label: 'Puzzle réussi' },
    { key: 'questionnaireValidated', label: 'Questionnaire validé' }
];

// Lit le fichier de réponses du questionnaire. Retourne toujours un tableau.
const readResponses = () => {
    try {
        if (!fs.existsSync(RESPONSES_FILE)) return [];
        const parsed = JSON.parse(fs.readFileSync(RESPONSES_FILE, 'utf8'));
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
};

// Construit un index "dernière réponse" par userId et par username
// pour rattacher les anciennes lignes même si les données sont incomplètes.
const buildLatestResponseMaps = () => {
    const byUserId = new Map();
    const byUsername = new Map();

    for (const responseRow of readResponses()) {
        const responseDateIso = responseRow?.date || null;
        const responseTimestamp = responseDateIso ? new Date(responseDateIso).getTime() : 0;
        const userId = responseRow?.userId ? String(responseRow.userId) : '';
        const username = String(responseRow?.username || responseRow?.user_name || '').trim().toLowerCase();

        if (userId) {
            const existingEntry = byUserId.get(userId);
            if (!existingEntry || responseTimestamp > existingEntry.ts) {
                byUserId.set(userId, { at: responseDateIso, ts: responseTimestamp });
            }
        }

        if (username) {
            const existingEntry = byUsername.get(username);
            if (!existingEntry || responseTimestamp > existingEntry.ts) {
                byUsername.set(username, { at: responseDateIso, ts: responseTimestamp });
            }
        }
    }

    return { byUserId, byUsername };
};

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
    const playerUsers = await User.find(
        {
            role: 'player',
            seeded: { $ne: true },
            username: { $not: /_af\d{3,4}$/i }
        },
        { username: 1, progress: 1, createdAt: 1 }
    ).lean();

    const responseMaps = buildLatestResponseMaps();

    const ranked = playerUsers
        .map((playerUser) => {
            const userId = String(playerUser._id);
            const normalizedUsername = String(playerUser.username || '').toLowerCase();
            // Fallback: si le progress ne contient pas questionnaireValidated,
            // on tente de l'inférer via le fichier questionnaire-responses.
            const latestResponseInfo =
                responseMaps.byUserId.get(userId) || responseMaps.byUsername.get(normalizedUsername) || null;

            const progress = {
                loggedIn: Boolean(playerUser.progress?.loggedIn),
                xssDone: Boolean(playerUser.progress?.xssDone),
                nosqlDone: Boolean(playerUser.progress?.nosqlDone),
                logsAccessed: Boolean(playerUser.progress?.logsAccessed),
                gatePassed: Boolean(playerUser.progress?.gatePassed),
                puzzleUnlocked: Boolean(playerUser.progress?.puzzleUnlocked),
                puzzleDone: Boolean(playerUser.progress?.puzzleDone),
                questionnaireValidated: Boolean(
                    playerUser.progress?.questionnaireValidated || playerUser.progress?.flagFound || latestResponseInfo
                ),
                questionnaireValidatedAt:
                    playerUser.progress?.questionnaireValidatedAt || playerUser.progress?.flagFoundAt || latestResponseInfo?.at || null
            };

            // Si questionnaire validé, on considère le parcours complet.
            if (progress.questionnaireValidated) {
                progress.loggedIn = true;
                progress.xssDone = true;
                progress.nosqlDone = true;
                progress.logsAccessed = true;
                progress.gatePassed = true;
                progress.puzzleUnlocked = true;
                progress.puzzleDone = true;
            }

            // Score = nombre d'étapes validées dans l'ordre défini par STEPS.
            const score = STEPS.reduce(
                (completedStepCount, stepDefinition) => completedStepCount + (progress[stepDefinition.key] ? 1 : 0),
                0
            );

            return {
                userId,
                username: playerUser.username,
                score,
                registeredAt: playerUser.createdAt,
                questionnaireValidatedAt: progress.questionnaireValidatedAt,
                steps: Object.fromEntries(
                    STEPS.map((stepDefinition) => [stepDefinition.label, progress[stepDefinition.key] ?? false])
                )
            };
        })
        .sort((leftEntry, rightEntry) => {
            // Tri: score décroissant puis heure de validation croissante (plus rapide d'abord).
            if (rightEntry.score !== leftEntry.score) return rightEntry.score - leftEntry.score;
            if (leftEntry.questionnaireValidatedAt && rightEntry.questionnaireValidatedAt) {
                return new Date(leftEntry.questionnaireValidatedAt) - new Date(rightEntry.questionnaireValidatedAt);
            }
            if (leftEntry.questionnaireValidatedAt) return -1;
            if (rightEntry.questionnaireValidatedAt) return 1;
            return 0;
        });

    return res.json({
        total: ranked.length,
        steps: STEPS.map((stepDefinition) => stepDefinition.label),
        leaderboard: ranked.map((entry, index) => ({ rank: index + 1, ...entry }))
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

// GET /admin/questionnaire-responses
const getQuestionnaireResponses = async (req, res) => {
    return res.json(readResponses());
};

module.exports = { getLeaderboard, deleteStudent, deleteAllStudents, getQuestionnaireResponses };

