const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email_domain: { type: String, required: true },
    max_users: { type: Number, default: 1000 }
});

// UPDATED: Index for faster domain queries
schoolSchema.index({ email_domain: 1 });

module.exports = mongoose.model('School', schoolSchema);