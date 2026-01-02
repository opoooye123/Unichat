// models/User.js
const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true }, // UPDATED: Ref to School _id
    verified: { type: Boolean, default: false },
    status: { type: String, default: 'active' },
    banCount: { type: Number, default: 0 },
    banReason: { type: String },
    banExpiresAt: { type: Date },
    role: { type: String, default: 'user' },  // 'user' or 'admin'
}, { timestamps: true });
module.exports = mongoose.model('User', userSchema);