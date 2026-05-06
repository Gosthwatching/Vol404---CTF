// Defini les routes HTTP reservees aux operations admin/prof.
const express = require('express');
const router = express.Router();
const profMiddleware = require('../middleware/profMiddleware');
const leaderboardController = require('../controllers/leaderboardController');

router.get('/leaderboard', profMiddleware, leaderboardController.getLeaderboard);

module.exports = router;

