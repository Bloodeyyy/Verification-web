// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  verified: { type: Boolean, default: false }, // ✅ easy filter
  accessToken: { type: String }, // ✅ guild join ke liye
  verifiedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", userSchema);