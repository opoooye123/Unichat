// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Register user (send OTP)
router.post('/register', authController.register);

// Verify OTP & get JWT
router.post('/verify-otp', authController.verifyOtp);

// Login user (no OTP)
router.post('/login', authController.login);

module.exports = router;
