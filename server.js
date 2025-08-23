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
    verifiedAt: new Date()
  },
  { upsert: true, new: true }
);

    res.send(`
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verification Successful</title>
    <style>
      body {
        margin: 0;
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #000; /* ✅ pure black background */
        font-family: "Inter", sans-serif;
        color: white;
        text-align: center;
      }
      .card {
        background: rgba(20, 20, 20, 0.9);
        padding: 50px 70px;
        border-radius: 18px;
        box-shadow: 0 0 25px rgba(255, 255, 255, 0.15);
        text-align: center;
        max-width: 420px;
        animation: fadeIn 1s ease-in-out;
      }
      .emoji {
        font-size: 3.5rem;
        color: #fff;
        text-shadow: 0 0 12px #fff, 0 0 25px #888;
      }
      h1 {
        margin: 20px 0 12px;
        font-size: 2rem;
        color: #fff;
        font-weight: bold; /* ✅ bold heading */
        text-shadow: 0 0 10px #ffffff55;
      }
      p {
        margin: 0;
        font-size: 1.2rem;
        color: #ddd;
        font-weight: bold; /* ✅ bold text */
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(25px); }
        to { opacity: 1; transform: translateY(0); }
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="emoji">✨</div>
      <h1>Verified Successfully</h1>
      <p>You may now close this tab.</p>
    </div>
  </body>
  </html>
`);
  } catch (err) {
    console.error(err);
    res.send("Error during verification!");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});