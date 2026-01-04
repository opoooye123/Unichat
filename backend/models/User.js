// backend/models/User.js - Add password field
const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // UPDATED: Add password
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  verified: { type: Boolean, default: false },
  status: { type: String, default: 'active' },
  banCount: { type: Number, default: 0 },
  banReason: { type: String },
  banExpiresAt: { type: Date },
  role: { type: String, default: 'user' },
}, { timestamps: true });
module.exports = mongoose.model('User', userSchema);