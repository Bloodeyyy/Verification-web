// models/User.js (web project)
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  discordId: { type: String, required: true },
  username: { type: String, required: true },
  accessToken: { type: String },
  refreshToken: { type: String },
  expiresAt: { type: Date },
  verified: { type: Boolean, default: false },
  verifiedAt: { type: Date, default: Date.now },
  roleAssigned: { type: Boolean, default: false } // ✅ important for bot
});

module.exports = mongoose.model("User", userSchema);