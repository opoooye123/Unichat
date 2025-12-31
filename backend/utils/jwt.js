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
 * Verify JWT middleware (Express)
 */
const verifyToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided" });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

/**
 * Admin / ban-check middleware
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
    verifyToken,
    blockBannedUsers
};
