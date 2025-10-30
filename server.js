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
    <title>Katabump: Verification Success</title>
    <!-- Use a better font for Discord aesthetic -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
    <style>
      :root {
        --discord-blurple: #5865F2;
        --discord-dark: #23272A;
        --discord-darker: #1A1D1F;
        --success-green: #38A169;
      }
      body {
        margin: 0;
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        /* Discord-like gradient background with dark theme */
        background: radial-gradient(circle at center, #2e3034 0%, #1a1d1f 100%); 
        font-family: 'Inter', sans-serif;
        color: white;
        text-align: center;
        overflow: hidden; /* Hide potential scrollbar from animations */
      }
      
      /* Glowing Background Effect (Discord-like) */
      .glow-blob {
          position: absolute;
          width: 300px;
          height: 300px;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.3;
          z-index: -1;
          animation: pulse 8s infinite alternate;
      }

      .blob-1 {
          background-color: var(--discord-blurple);
          top: 10%;
          left: 10%;
      }

      .blob-2 {
          background-color: var(--success-green);
          bottom: 10%;
          right: 10%;
          animation-delay: 2s;
      }
      
      .card {
        /* Glass/Frosted effect for a modern aesthetic look */
        background: rgba(35, 39, 42, 0.8); /* Semi-transparent dark background */
        backdrop-filter: blur(10px); /* Frosted Glass Effect */
        border: 1px solid rgba(100, 100, 100, 0.2); /* Light border for definition */
        padding: 0; /* Padding removed from card, added to content */
        border-radius: 16px;
        overflow: hidden; /* To contain the header strip */
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37); /* Stronger shadow */
        text-align: center;
        max-width: 90%; /* Responsive width for mobile */
        width: 350px;
        animation: fadeIn 1s ease-in-out;
      }

      /* New Header Strip */
      .card-header {
        background-color: var(--discord-blurple);
        height: 10px; /* Slim, aesthetic strip */
      }
      
      /* Content padding */
      .card-content {
        padding: 40px 30px;
      }

      .icon-container {
        /* Checked Icon (SVG) - Modern and High Quality */
        width: 60px;
        height: 60px;
        margin: 0 auto 20px;
        color: var(--success-green);
        animation: scaleIn 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55);
      }

      .icon-svg {
        fill: none;
        stroke: currentColor;
        stroke-width: 3;
        stroke-linecap: round;
        stroke-linejoin: round;
        width: 100%;
        height: 100%;
      }

      h1 {
        margin: 0 0 10px;
        font-size: 1.8rem;
        font-weight: 800; /* Extra bold for impact */
        color: white;
      }
      
      p {
        margin: 0;
        font-size: 1rem;
        color: #B9BBBE; /* Discord subtle text color */
        font-weight: 400;
      }
      
      .close-text {
        margin-top: 25px;
        font-size: 0.9rem;
        color: #72767D; /* Very subtle text */
      }

      /* Animations */
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @keyframes pulse {
          0% { transform: scale(1) translate(-20px, -20px); }
          100% { transform: scale(1.1) translate(20px, 20px); }
      }
      
      @keyframes scaleIn {
        from { transform: scale(0.5); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      
    </style>
  </head>
  <body>
    <!-- Background Glow Blobs -->
    <div class="glow-blob blob-1"></div>
    <div class="glow-blob blob-2"></div>
    
    <div class="card">
      <!-- New aesthetic header strip -->
      <div class="card-header"></div>
      
      <div class="card-content">
        <div class="icon-container">
          <!-- Modern Checkmark SVG -->
          <svg class="icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        
        <h1>Verification Success!</h1>
        <!-- UPDATED DESCRIPTION -->
        <p>Thank you for verifying using the Zerxys panel.</p> 
        <p class="close-text">You can safely close this window now.</p>
      </div>
    </div>
  </body>
  </html>