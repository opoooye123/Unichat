const User = require("../models/User");

module.exports = async (req, res, next) => {
  const user = await User.findById(req.user._id);

  if (!user) return res.status(401).json({ message: "Unauthorized" });

  if (user.status === "banned") {
    if (user.banExpiresAt && user.banExpiresAt < Date.now()) {
      user.status = "active";
      user.banExpiresAt = null;
      user.banReason = null;
      await user.save();
      return next();
    }

    return res.status(403).json({
      banned: true,
      reason: user.banReason,
      expiresAt: user.banExpiresAt
    });
  }

  next();
};
