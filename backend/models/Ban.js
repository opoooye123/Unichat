const mongoose = require("mongoose");

const banSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  ip: {
    type: String
  },

  deviceHash: {
    type: String
  },

  reason: {
    type: String,
    required: true
  },

  paid: {
    type: Boolean,
    default: false
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Ban", banSchema);
