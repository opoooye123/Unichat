const jwt = require('jsonwebtoken');
const User = require('../models/User');
const verifyJWT = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1]; // ✅ extract token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }
        if (!user.verified) {
            return res.status(403).json({ message: 'User not verified' });
        }
        // Integrated ban check with auto-unban for temp bans
        if (user.status === 'banned') {
            if (user.banExpiresAt && user.banExpiresAt < new Date()) {
                user.status = 'active';
                user.banExpiresAt = null;
                user.banReason = null;
                await user.save();
            } else {
                return res.status(403).json({
                    banned: true,
                    reason: user.banReason,
                    expiresAt: user.banExpiresAt
                });
            }
        }
        req.user = user;
        next();
    } catch (err) {
        console.error('JWT verify error:', err);
        return res.status(401).json({ message: 'Invalid token' });
    }
};
module.exports = verifyJWT;