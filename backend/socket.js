const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Session = require("./models/Session");
const Report = require("./models/Report");
const Ban = require("./models/Ban");

// Connected users: userId => { socketId, schoolId }
const connectedUsers = new Map();

// UPDATED: Dynamic school queues: schoolId => Set(userIds)
const matchQueues = new Map();

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
    const schoolId = user.schoolId.toString(); // UPDATED: toString for consistency

    console.log(`User connected: ${user.name} (${userId}) from ${schoolId} | Socket ID: ${socket.id}`);
    connectedUsers.set(userId, { socketId: socket.id, schoolId });

    // Emit updated online count on connect
    io.emit('onlineUsers', connectedUsers.size);

    const leaveQueue = () => {
      matchQueues.get(schoolId)?.delete(userId);
      userPreferences.delete(userId);
    };

    const findMatch = async () => {
      const preferences = userPreferences.get(userId);
      if (!preferences) return;

      const candidates = [];
      const targetSchools = preferences.targetSchool === 'any'
        ? Array.from(matchQueues.keys())
        : (preferences.targetSchool === 'same' ? [schoolId] : [preferences.targetSchool]);

      for (const s of targetSchools) {
        const queue = matchQueues.get(s) || new Set();
        for (const candidateId of queue) {
          if (candidateId === userId) continue;
          const cPref = userPreferences.get(candidateId);
          if (!cPref || cPref.lastPartner === userId || preferences.lastPartner === candidateId) continue;

          // Simple mutual check
          const matchesUser = preferences.targetSchool === 'any' ||
            (preferences.targetSchool === 'same' && s === schoolId) || preferences.targetSchool === s;
          const matchesCandidate = cPref.targetSchool === 'any' ||
            (cPref.targetSchool === 'same' && s === cPref.ownSchool) || cPref.targetSchool === schoolId;

          if (matchesUser && matchesCandidate) candidates.push({ id: candidateId, school: s });
        }
      }

      if (!candidates.length) {
        // UPDATED: Retry for Omegle-like waiting
        setTimeout(findMatch, 5000); // Retry every 5s
        return console.log(`No match yet for ${userId}`);
      }

      const { id: partnerId, school: partnerSchool } = candidates[Math.floor(Math.random() * candidates.length)];

      // Remove from queues
      matchQueues.get(schoolId)?.delete(userId);
      matchQueues.get(partnerSchool)?.delete(partnerId);

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

          // Assign initiator: lower userId is initiator
          const initiatorId = userId < partnerId ? userId : partnerId;
          const isUserInitiator = initiatorId === userId;

          io.to(s1).emit("matchFound", {
            sessionId: session._id,
            partnerId,
            isInitiator: isUserInitiator
          });
          io.to(s2).emit("matchFound", {
            sessionId: session._id,
            partnerId: userId,
            isInitiator: !isUserInitiator
          });
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
      if (!matchQueues.has(schoolId)) matchQueues.set(schoolId, new Set()); // UPDATED: Dynamic
      matchQueues.get(schoolId).add(userId);
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
      matchQueues.get(schoolId)?.add(userId); // re-add to queue
      findMatch();
    });

    // Unified WebRTC signaling
    socket.on("signaling", (data) => {
      const targetSocketId = connectedUsers.get(data.targetUserId)?.socketId;
      if (targetSocketId) io.to(targetSocketId).emit("signaling", data);
      else socket.emit('signalingError', { msg: 'Partner offline' });
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
      // Emit updated online count on disconnect
      io.emit('onlineUsers', connectedUsers.size);
    });
  });
};

module.exports = socketHandler