// Defini les routes HTTP reservees aux operations admin/prof.
const express = require('express');
const router = express.Router();
const profMiddleware = require('../middleware/profMiddleware');
const leaderboardController = require('../controllers/leaderboardController');

router.get('/leaderboard', profMiddleware, leaderboardController.getLeaderboard);
router.post('/cleanup-fake-users', profMiddleware, leaderboardController.cleanupFakeUsers);
router.delete('/student/:userId', profMiddleware, leaderboardController.deleteStudent);
router.delete('/students', profMiddleware, leaderboardController.deleteAllStudents);

module.exports = router;

