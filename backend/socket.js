const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Session = require("./models/Session");
const Report = require("./models/Report");
const Ban = require("./models/Ban");

// Connected users: userId => { socketId, schoolId }
const connectedUsers = new Map();

// School queues (Set to avoid duplicates)
const matchQueues = {
  unilag: new Set(),
  futa: new Set(),
  babcock: new Set(),
  caleb: new Set(),
  pau: new Set(),
};

// User preferences: userId => { ownSchool, targetSchool, lastPartner }
const userPreferences = new Map();

const socketHandler = (io) => {
  // AUTH MIDDLEWARE
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      console.log("Connection rejected: No token provided");
      return next(new Error("No token provided"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id || decoded._id);

      if (!user) {
        console.log("Connection rejected: User not found");
        return next(new Error("Unauthorized: User not found"));
      }

      if (user.status === "banned") {
        console.log(`Connection rejected: User ${user._id} is banned`);
        return next(new Error("BANNED"));
      }

      socket.user = user;
      next();
    } catch (err) {
      console.log("Connection rejected: Invalid token", err.message);
      return next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.user;
    const userId = user._id.toString();
    const schoolId = user.schoolId;

    console.log(`User connected: ${user.name} (${userId}) from ${schoolId} | Socket ID: ${socket.id}`);

    // Store connected user
    connectedUsers.set(userId, { socketId: socket.id, schoolId });

    // NEW: Allow user to manually leave the queue (fixes cancel search bug)
    socket.on("leaveQueue", () => {
      if (matchQueues[schoolId]) {
        matchQueues[schoolId].delete(userId);
      }
      userPreferences.delete(userId);

      console.log(`User ${userId} (${user.name}) left the queue manually`);
    });

    // JOIN QUEUE
    socket.on("joinQueue", async ({ targetSchool } = {}) => {
      console.log(`User ${userId} joining queue with target: ${targetSchool || 'any'}`);

      userPreferences.set(userId, {
        ownSchool: schoolId,
        targetSchool: targetSchool || "any",
        lastPartner: userPreferences.get(userId)?.lastPartner || null,
      });

      if (!matchQueues[schoolId]) {
        console.warn(`Unknown school: ${schoolId}`);
        return;
      }

      matchQueues[schoolId].add(userId);

      // Find candidates
      const candidates = [];

      for (const [school, queue] of Object.entries(matchQueues)) {
        for (const candidateId of queue) {
          if (candidateId === userId) continue;

          const candidatePref = userPreferences.get(candidateId);
          if (!candidatePref) continue;

          // Prevent rematch with recent partner
          if (candidatePref.lastPartner === userId || userPreferences.get(userId).lastPartner === candidateId) continue;

          const userWants =
            candidatePref.targetSchool === "any" ||
            (candidatePref.targetSchool === "same" && school === schoolId) ||
            candidatePref.targetSchool === schoolId;

          const candidateWants =
            (targetSchool || "any") === "any" ||
            ((targetSchool || "any") === "same" && school === schoolId) ||
            (targetSchool || "any") === school;

          if (userWants && candidateWants) {
            candidates.push(candidateId);
          }
        }
      }

      if (candidates.length === 0) {
        console.log(`No match found for ${userId} yet – staying in queue`);
        return;
      }

      const partnerId = candidates[Math.floor(Math.random() * candidates.length)];
      console.log(`Match found! ${userId} ↔ ${partnerId}`);

      // Remove both from queues
      matchQueues[schoolId].delete(userId);
      const partnerSchool = userPreferences.get(partnerId)?.ownSchool;
      if (partnerSchool && matchQueues[partnerSchool]) {
        matchQueues[partnerSchool].delete(partnerId);
      }

      // Update lastPartner
      userPreferences.get(userId).lastPartner = partnerId;
      userPreferences.get(partnerId).lastPartner = userId;

      const s1 = connectedUsers.get(userId)?.socketId;
      const s2 = connectedUsers.get(partnerId)?.socketId;

      if (s1 && s2) {
        try {
          const session = await Session.create({
            participants: [userId, partnerId],
            status: "active",
          });

          io.to(s1).emit("matchFound", { sessionId: session._id, partnerId });
          io.to(s2).emit("matchFound", { sessionId: session._id, partnerId: userId });

          console.log(`Session created: ${session._id} | ${userId} ↔ ${partnerId}`);
        } catch (err) {
          console.error("Failed to create session:", err);
        }
      } else {
        console.warn("One partner disconnected before match confirmation");
      }
    });

    // SKIP / END SESSION
    socket.on("skip", async ({ sessionId } = {}) => {
      console.log(`User ${userId} skipped ${sessionId ? `session ${sessionId}` : 'queue'}`);

      if (sessionId) {
        try {
          const session = await Session.findById(sessionId);
          if (session) {
            session.status = "ended";
            session.endedAt = new Date();
            await session.save();
          }
        } catch (err) {
          console.error("Error ending session:", err);
        }
      }

      // Send rejoinQueue to THIS user only (frontend will handle navigation)
      socket.emit("rejoinQueue");
    });

    // WebRTC SIGNALING
    ["offer", "answer", "ice-candidate"].forEach((event) => {
      socket.on(event, (data) => {
        const targetSocketId = connectedUsers.get(data.targetUserId)?.socketId;
        if (targetSocketId) {
          io.to(targetSocketId).emit(event, data);
          console.log(`Relayed ${event} from ${userId} → ${data.targetUserId}`);
        }
      });
    });

    // CHAT MESSAGES
    socket.on("chat-message", (data) => {
      const targetSocketId = connectedUsers.get(data.targetUserId)?.socketId;
      if (targetSocketId) {
        io.to(targetSocketId).emit("chat-message", data);
      }
    });

    // REPORT USER
    socket.on("report-user", async ({ reportedUserId, reason }) => {
      try {
        await Report.create({ reporter: userId, reported: reportedUserId, reason });

        const reportCount = await Report.countDocuments({ reported: reportedUserId });
        const reportedUser = await User.findById(reportedUserId);

        if (reportedUser && reportCount >= 3) {
          reportedUser.status = "banned";
          reportedUser.banCount += 1;
          reportedUser.banReason = reason;
          reportedUser.banExpiresAt = reportCount < 5 ? new Date(Date.now() + 86400000) : null;

          await reportedUser.save();
          await Ban.create({ user: reportedUserId, reason });

          const targetSocketId = connectedUsers.get(reportedUserId)?.socketId;
          if (targetSocketId) {
            io.to(targetSocketId).emit("banned", { reason });
            io.sockets.sockets.get(targetSocketId)?.disconnect(true);
            console.log(`User ${reportedUserId} banned and disconnected`);
          }
        }

        socket.emit("report-status", { success: true });
      } catch (err) {
        console.error("Report error:", err);
        socket.emit("report-status", { success: false });
      }
    });

    // DISCONNECT
    socket.on("disconnect", (reason) => {
      console.log(`User ${userId} (${user.name}) disconnected: ${reason}`);

      connectedUsers.delete(userId);

      // Clean up from queue if they were waiting
      if (matchQueues[schoolId]) {
        matchQueues[schoolId].delete(userId);
      }
      userPreferences.delete(userId);
    });
  });
};

module.exports = socketHandler;