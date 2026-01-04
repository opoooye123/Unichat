// Get current user profile
exports.getProfile = async (req, res) => {
    try {
        const user = req.user; // set by verifyJWT middleware
        res.status(200).json({
            id: user._id,
            name: user.name,
            email: user.email,
            schoolId: user.schoolId,
            status: user.status,
            banCount: user.banCount,
            banReason: user.banReason,  // ← Added for frontend display
            banExpiresAt: user.banExpiresAt
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};