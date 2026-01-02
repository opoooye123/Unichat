const Report = require("../models/Report");
const User = require("../models/User");
const Ban = require("../models/Ban");

const applyBanLogic = async (reportedUserId, reason, req) => {
  const reportCount = await Report.countDocuments({ reported: reportedUserId, status: 'approved' });  // UPDATED: Only approved
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
    if (reportedUserId.toString() === reporterId.toString()) {
      return res.status(400).json({ message: "You cannot report yourself" });
    }
    // Basic rate-limit
    const recentReports = await Report.countDocuments({ reporter: reporterId, createdAt: { $gt: new Date(Date.now() - 60 * 60 * 1000) } });
    if (recentReports >= 5) return res.status(429).json({ message: "Too many reports - try later" });

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
    console.error('Report error:', err);
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATED: New admin approve endpoint
exports.approveReport = async (req, res) => {
  try {
    const { reportId, reason } = req.body; // reason optional override
    const report = await Report.findById(reportId);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    if (report.status !== 'pending') return res.status(400).json({ message: 'Already processed' });

    // Add role check if needed: if (req.user.role !== 'admin') return res.status(403);

    report.status = 'approved';
    await report.save();

    const banType = await applyBanLogic(report.reported, reason || report.reason, req);
    res.json({ success: true, banType });
  } catch (err) {
    console.error('Approve report error:', err);
    res.status(500).json({ message: 'Server error' });
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
    console.error('Get reports error:', err);
    res.status(500).json({ message: "Server error" });
  }
};