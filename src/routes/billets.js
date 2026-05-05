const express = require('express');
const router = express.Router();
const billetController = require('../controllers/billetController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/my', authMiddleware, billetController.getMyTicket);
router.get('/scan-status/:scanId', authMiddleware, billetController.getScanStatus);
router.post('/search', authMiddleware, billetController.searchTicket);
router.get('/manifests', billetController.getManifests); // accessible sans auth — exploration des manifests
router.get('/passengers', billetController.getAllPassengers); // accessible sans auth — indice CTF

module.exports = router;