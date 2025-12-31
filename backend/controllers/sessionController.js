const Session = require('../models/Session');

// Start a video session
exports.startSession = async (req, res) => {
    try {
        const { targetUserId } = req.body;
        if (!targetUserId) return res.status(400).json({ message: 'Target user required' });

        const session = new Session({
            participants: [req.user._id, targetUserId],
            status: 'active',
            startedAt: new Date()
        });
        await session.save();

        res.status(200).json({ message: 'Session started', sessionId: session._id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// End a video session
exports.endSession = async (req, res) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) return res.status(400).json({ message: 'Session ID required' });

        const session = await Session.findById(sessionId);
        if (!session) return res.status(404).json({ message: 'Session not found' });

        session.status = 'ended';
        session.endedAt = new Date();
        await session.save();

        res.status(200).json({ message: 'Session ended' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
