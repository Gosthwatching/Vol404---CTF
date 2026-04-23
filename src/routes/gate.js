const express = require('express');
const router = express.Router();
const gateController = require('../controllers/gateController');

// QR scans often happen on a different device without the browser session,
// so gate access is token-based and intentionally public for the CTF flow.
router.get('/:token', gateController.getGate);

module.exports = router;
