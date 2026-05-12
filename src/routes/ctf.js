const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { buildPuzzleAccessStatus } = require('../middleware/ctfProgressMiddleware');

router.get('/puzzle-access', authMiddleware, async (req, res) => {
    const status = await buildPuzzleAccessStatus(req);
    const code = status.ready ? 200 : 403;
    return res.status(code).json(status);
});

module.exports = router;
