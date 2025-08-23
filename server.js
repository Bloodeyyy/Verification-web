import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import axios from "axios";
import User from "./models/User.js";

dotenv.config();
const app = express();

const PORT = process.env.PORT || 3000;

// MongoDB Connect
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("MongoDB Error:", err));

// Home page
app.get("/", (req, res) => {
  res.send("✅ Verification Website is Running!");
});

// ✅ Login route (Discord OAuth2 authorize link)
app.get("/login", (req, res) => {
  const redirect = `https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${encodeURIComponent(
    process.env.REDIRECT_URI
  )}&response_type=code&scope=identify%20guilds.join`;
  res.redirect(redirect);
});

// ✅ Callback route
app.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send("No code provided!");

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post(
      "https://discord.com/api/oauth2/token",
      new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.REDIRECT_URI,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const tokenData = tokenResponse.data;
    if (!tokenData.access_token) return res.send("Error getting access token!");

    // Get user info
    const userResponse = await axios.get("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userData = userResponse.data;

    // ✅ Save user in DB with accessToken
    await User.findOneAndUpdate(
  { discordId: userData.id },
  {
    discordId: userData.id,
    username: `${userData.username}#${userData.discriminator}`,
    accessToken: tokenData.access_token,
    ...(tokenData.refresh_token && { refreshToken: tokenData.refresh_token }),
    expiresAt: Date.now() + tokenData.expires_in * 1000,
    verified: true,
    verifiedAt: new Date(),
    roleAssigned: false // ✅ ensure bot assigns role
  },
  { upsert: true, new: true }
);

    res.send("✅ Verification Successful! You can close this tab now.");
  } catch (err) {
    console.error(err);
    res.send("Error during verification!");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});