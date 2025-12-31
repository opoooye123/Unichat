const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, default: 'active' },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date }
});

module.exports = mongoose.model('Session', sessionSchema);
