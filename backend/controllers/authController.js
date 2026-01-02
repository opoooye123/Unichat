const User = require('../models/User');
const Otp = require('../models/Otp'); // UPDATED: Import Otp model
const School = require('../models/School'); // UPDATED: Import School for dynamic domains
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/emailService');

// 1️⃣ Register & send OTP
exports.register = async (req, res) => {
    try {
        console.log("BODY:", req.body);
        const { name, email } = req.body;
        if (!name || !email) return res.status(400).json({ message: 'Name and email required' });

        const domain = email.split('@')[1];
        const school = await School.findOne({ email_domain: domain }); // UPDATED: Query School model
        if (!school) return res.status(400).json({ message: 'Email domain not allowed' });
        const schoolId = school._id; // UPDATED: Use School _id as ref

        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: 'User already exists' });

        user = await User.create({ name, email, schoolId });
        
        // UPDATED: Use Otp model
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await Otp.create({ email, code, expiresAt });

        // Send OTP via email
        await sendEmail(email, 'Your OTP Code', `Your OTP is: ${code}. Expires in 10 minutes.`);
        res.status(200).json({ message: 'OTP sent to your email' });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// 2️⃣ Verify OTP & issue JWT
exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ message: 'Email and OTP required' });

        // UPDATED: Query Otp model
        const otpRecord = await Otp.findOne({ email, code: otp });
        if (!otpRecord) return res.status(400).json({ message: 'Invalid OTP' });
        if (new Date() > otpRecord.expiresAt) {
            await Otp.deleteOne({ _id: otpRecord._id });
            return res.status(400).json({ message: 'OTP expired' });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'User not found' });

        // UPDATED: Auto-unban if expired
        if (user.status === 'banned' && user.banExpiresAt && new Date() > user.banExpiresAt) {
            user.status = 'active';
            user.banExpiresAt = undefined;
        }

        user.verified = true;
        await user.save();
        await Otp.deleteOne({ _id: otpRecord._id }); // UPDATED: Cleanup

        // Issue JWT
        const token = jwt.sign(
            { id: user._id, schoolId: user.schoolId, status: user.status },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        res.status(200).json({ message: 'Verified successfully', token });
    } catch (err) {
        console.error('Verify OTP error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// LOGIN (send OTP instead of direct token)
exports.login = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email required" });

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });
        if (!user.verified) return res.status(403).json({ message: "Email not verified" });

        // UPDATED: Auto-unban if expired
        if (user.status === 'banned' && user.banExpiresAt && new Date() > user.banExpiresAt) {
            user.status = 'active';
            user.banExpiresAt = undefined;
            await user.save();
        }
        if (user.status === "banned") return res.status(403).json({ message: "User is banned" });

        // UPDATED: Use Otp model
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await Otp.create({ email, code, expiresAt });

        await sendEmail(email, 'Login OTP', `Your login OTP is: ${code}. Expires in 10 minutes.`);
        res.status(200).json({ message: 'OTP sent for login' });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: "Server error" });
    }
};