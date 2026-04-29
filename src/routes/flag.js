const express = require('express');
const router = express.Router();
const flagController = require('../controllers/flagController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, flagController.checkFlag);

module.exports = router;
