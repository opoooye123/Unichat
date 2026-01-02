const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const verifyJWT = require('../middleware/auth');


// Get current user profile
router.get('/me', verifyJWT, userController.getProfile);

module.exports = router;
