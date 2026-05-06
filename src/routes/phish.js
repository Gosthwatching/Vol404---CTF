// Routes phishing V1: report lien et lecture statut de review.
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const phishController = require('../controllers/phishController');

router.post('/report', authMiddleware, phishController.createReport);
router.get('/result/:reportId', authMiddleware, phishController.getReportResult);

module.exports = router;
