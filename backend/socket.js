const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Session = require("./models/Session");
const Report = require("./models/Report");
const Ban = require("./models/Ban");

// Connected users: userId => { socketId, schoolId }
const connectedUsers = new Map();

// School queues
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
    if (!token) return next(new Error("No token provided"));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id || decoded._id);
      if (!user) return next(new Error("Unauthorized: User not found"));
      if (user.status === "banned") return next(new Error("BANNED"));

      socket.user = user;
      next();
    } catch (err) {
      return next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.user;
    const userId = user._id.toString();
    const schoolId = user.schoolId;

    console.log(`User connected: ${user.name} (${userId}) from ${schoolId} | Socket ID: ${socket.id}`);
    connectedUsers.set(userId, { socketId: socket.id, schoolId });

    const leaveQueue = () => {
      matchQueues[schoolId]?.delete(userId);
      userPreferences.delete(userId);
    };

    const findMatch = async () => {
      const preferences = userPreferences.get(userId);
      if (!preferences) return;

      const candidates = [];

      for (const [s, queue] of Object.entries(matchQueues)) {
        for (const candidateId of queue) {
          if (candidateId === userId) continue;
          const cPref = userPreferences.get(candidateId);
          if (!cPref) continue;
          if (cPref.lastPartner === userId || preferences.lastPartner === candidateId) continue;

          const userWants = cPref.targetSchool === "any" || (cPref.targetSchool === "same" && s === schoolId) || cPref.targetSchool === schoolId;
          const candidateWants = preferences.targetSchool === "any" || (preferences.targetSchool === "same" && s === schoolId) || preferences.targetSchool === s;

          if (userWants && candidateWants) candidates.push(candidateId);
        }
      }

      if (!candidates.length) return console.log(`No match yet for ${userId}`);

      const partnerId = candidates[Math.floor(Math.random() * candidates.length)];
      console.log(`Match found: ${userId} ↔ ${partnerId}`);

      // Remove from queues
      matchQueues[schoolId]?.delete(userId);
      const partnerSchool = userPreferences.get(partnerId)?.ownSchool;
      matchQueues[partnerSchool]?.delete(partnerId);

      // Update lastPartner
      preferences.lastPartner = partnerId;
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
        } catch (err) {
          console.error("Session creation failed:", err);
        }
      }
    };

    // Join matchmaking queue
    socket.on("joinQueue", ({ targetSchool } = {}) => {
      userPreferences.set(userId, {
        ownSchool: schoolId,
        targetSchool: targetSchool || "any",
        lastPartner: userPreferences.get(userId)?.lastPartner || null,
      });
      matchQueues[schoolId]?.add(userId);
      findMatch();
    });

    // Skip → Next partner
    socket.on("skip", async ({ sessionId } = {}) => {
      if (sessionId) {
        const session = await Session.findById(sessionId);
        if (session) {
          session.status = "ended";
          session.endedAt = new Date();
          await session.save();
        }
      }
      matchQueues[schoolId]?.add(userId); // re-add to queue
      findMatch();
    });

    // WebRTC signaling
    ["offer", "answer", "ice-candidate"].forEach((event) => {
      socket.on(event, (data) => {
        const targetSocketId = connectedUsers.get(data.targetUserId)?.socketId;
        if (targetSocketId) io.to(targetSocketId).emit(event, data);
      });
    });

    // Chat messages
    socket.on("chat-message", ({ targetUserId, message }) => {
      const targetSocketId = connectedUsers.get(targetUserId)?.socketId;
      if (targetSocketId) io.to(targetSocketId).emit("chat-message", { message, fromUserId: userId });
    });

    // Typing indicator
    socket.on("typing", ({ targetUserId, isTyping }) => {
      const targetSocketId = connectedUsers.get(targetUserId)?.socketId;
      if (targetSocketId) io.to(targetSocketId).emit("typing", { isTyping });
    });

    // Partner disconnect / leave
    socket.on("leaveQueue", () => {
      leaveQueue();
    });

    socket.on("disconnect", () => {
      connectedUsers.delete(userId);
      leaveQueue();
    });
  });
};

module.exports = socketHandler;
