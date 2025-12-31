// Get current user profile
exports.getProfile = async (req, res) => {
    try {
        const user = req.user; // set by verifyJWT middleware
        res.status(200).json({
            id: user._id,
            name: user.name,
            email: user.email,
            schoolId: user.schoolId,
            verified: user.verified,
            status: user.status,
            banCount: user.banCount
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
