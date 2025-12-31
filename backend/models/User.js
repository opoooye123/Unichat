// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    schoolId: { type: String, required: true },
    verified: { type: Boolean, default: false },
    status: { type: String, default: 'active' },
    banCount: { type: Number, default: 0 },
    otp: { type: String },          // store the OTP temporarily
    otpExpires: { type: Date }      // expiration time
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
