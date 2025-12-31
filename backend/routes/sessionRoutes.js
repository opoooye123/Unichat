const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const verifyJWT = require('../middleware/auth');

// Start a video session
router.post('/start', verifyJWT, sessionController.startSession);

// End a video session
router.post('/end', verifyJWT, sessionController.endSession);

module.exports = router;
