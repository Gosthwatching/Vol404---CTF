const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/User');
const { buildPuzzleAccessStatus } = require('../middleware/ctfProgressMiddleware');

const resolveProgressUserId = (req) => {
    return req.session?.trackedPlayerId || req.session?.user?.id || null;
};

router.get('/puzzle-access', authMiddleware, async (req, res) => {
    const status = await buildPuzzleAccessStatus(req);
    const code = status.ready ? 200 : 403;
    return res.status(code).json(status);
});

router.post('/puzzle-complete', authMiddleware, async (req, res) => {
    const userId = resolveProgressUserId(req);
    if (!userId) {
        return res.status(401).json({ error: 'Connexion requise.' });
    }

    await User.updateOne(
        { _id: userId },
        { $set: { 'progress.puzzleUnlocked': true, 'progress.puzzleDone': true, 'progress.ctfFinished': true } }
    );

    return res.json({ success: true });
});

module.exports = router;
