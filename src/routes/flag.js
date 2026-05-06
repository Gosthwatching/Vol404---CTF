// Defini routes HTTP de validation du flag et token acces.
const express = require('express');
const router = express.Router();
const flagController = require('../controllers/flagController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, flagController.checkFlag);
router.post('/unlock', authMiddleware, flagController.unlockFlagPage);
router.get('/status', authMiddleware, flagController.getFlagStatus);

module.exports = router;

