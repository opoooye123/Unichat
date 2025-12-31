// controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/emailService');

const allowedDomains = {
    "live.unilag.edu.ng": "unilag",
    "futa.edu.ng": "futa",
    "babcock.edu.ng": "babcock",
    "caleb.edu.ng": "caleb",
    "pau.edu.ng": "pau"
};

// 1️⃣ Register & send OTP
exports.register = async (req, res) => {
    try {
        console.log("BODY:", req.body);
        const { name, email } = req.body;
        if (!name || !email) return res.status(400).json({ message: 'Name and email required' });

        const domain = email.split('@')[1];
        const schoolId = allowedDomains[domain];
        if (!schoolId) return res.status(400).json({ message: 'Email domain not allowed' });

        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: 'User already exists' });

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        user = await User.create({ name, email, schoolId, otp, otpExpires });

        // Send OTP via email
        await sendEmail(email, 'Your OTP Code', `Your OTP is: ${otp}. Expires in 10 minutes.`);

        res.status(200).json({ message: 'OTP sent to your email' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// 2️⃣ Verify OTP & issue JWT
exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ message: 'Email and OTP required' });

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'User not found' });
        if (user.verified) return res.status(400).json({ message: 'User already verified' });

        if (user.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });
        if (new Date() > user.otpExpires) return res.status(400).json({ message: 'OTP expired' });

        user.verified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        // Issue JWT
        const token = jwt.sign(
            { id: user._id, schoolId: user.schoolId, status: user.status },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(200).json({ message: 'Verified successfully', token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
// LOGIN (no OTP)
exports.login = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email required" });

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        if (!user.verified)
            return res.status(403).json({ message: "Email not verified" });

        if (user.status === "banned")
            return res.status(403).json({ message: "User is banned" });

        const token = jwt.sign(
            { id: user._id, schoolId: user.schoolId, status: user.status },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(200).json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};
