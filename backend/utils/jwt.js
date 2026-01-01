const jwt = require("jsonwebtoken");
require("dotenv").config();
/**
 * Generate JWT for a user
 * @param {Object} user
 */
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            email: user.email,
            schoolId: user.schoolId,
            status: user.status
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
};
/**
 * Admin / ban-check middleware (optional, since integrated in verifyJWT)
 */
const blockBannedUsers = (req, res, next) => {
    if (req.user.status === "banned") {
        return res.status(403).json({
            message: "Your account is banned. Pay unban fee to regain access."
        });
    }
    next();
};
module.exports = {
    generateToken,
    blockBannedUsers
};