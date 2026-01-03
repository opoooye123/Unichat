// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/authController');

router.post('/register', authCtrl.register);
router.post('/login', authCtrl.login);
router.post('/verify-otp', authCtrl.verifyOtp);
router.post('/resend-otp', authCtrl.resendOtp);

module.exports = router;
