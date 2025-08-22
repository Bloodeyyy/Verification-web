import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import fetch from "node-fetch";
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
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) return res.send("Error getting access token!");

    // Get user info
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userResponse.json();

    // Save user in DB
    await User.findOneAndUpdate(
      { discordId: userData.id },
      {
        discordId: userData.id,
        username: `${userData.username}#${userData.discriminator}`,
        verified: true,
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