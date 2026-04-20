const express = require('express');
const router = express.Router();
const billetController = require('../controllers/billetController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/my', authMiddleware, billetController.getMyTicket);
router.post('/search', authMiddleware, billetController.searchTicket);

module.exports = router;