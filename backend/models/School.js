const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email_domain: { type: String, required: true },
    max_users: { type: Number, default: 1000 }
});

module.exports = mongoose.model('School', schoolSchema);
