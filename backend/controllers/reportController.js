const Report = require("../models/Report");
const User = require("../models/User");
const Ban = require("../models/Ban");

const applyBanLogic = async (reportedUserId, reason, req) => {
  const reportCount = await Report.countDocuments({ reported: reportedUserId });
  const user = await User.findById(reportedUserId);
  if (!user) return null;

  let banType = null;

  if (reportCount >= 3 && reportCount < 5) banType = "temporary";
  if (reportCount >= 5 && reportCount < 7) banType = "paid";
  if (reportCount >= 7) banType = "permanent";

  if (!banType) return null;

  user.status = "banned";
  user.banCount += 1;
  user.banReason = reason;

  if (banType === "temporary") {
    user.banExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  } else {
    user.banExpiresAt = null;
  }

  await user.save();

  await Ban.create({
    user: reportedUserId,
    ip: req.ip,
    reason
  });

  return banType;
};

// HTTP report
exports.submitReport = async (req, res) => {
  try {
    const { reportedUserId, reason } = req.body;
    const reporterId = req.user._id;

    if (!reportedUserId || !reason) {
      return res.status(400).json({ message: "Missing fields" });
    }

    if (reportedUserId === reporterId.toString()) {
      return res.status(400).json({ message: "You cannot report yourself" });
    }

    await Report.create({
      reporter: reporterId,
      reported: reportedUserId,
      reason,
      status: "pending"
    });

    const action = await applyBanLogic(reportedUserId, reason, req);

    res.json({
      success: true,
      action: action || "warning"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin only
exports.getAllReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .populate("reporter", "name email")
      .populate("reported", "name email");

    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
