const express = require('express');
const router = express.Router();
const gateController = require('../controllers/gateController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/:token', authMiddleware, gateController.getGate);

module.exports = router;
