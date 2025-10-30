const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const axios = require("axios");
// FIX 1: Change import to require for CommonJS stability, especially on Render.
const User = require("./models/User"); 

dotenv.config();
const app = express();

const PORT = process.env.PORT || 3000;

// MongoDB Connect
mongoose
  .connect(process.env.MONGO_URI)
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

// ✅ Callback route (Aesthetic and Responsive HTML)
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
        // Handling new Discord usernames without discriminator
        username: userData.discriminator === "0" ? userData.username : `${userData.username}#${userData.discriminator}`,
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
    <title>Zerxys: Verification Success</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
    <style>
      :root {
        --discord-blurple: #5865F2;
        --discord-dark: #23272A;
        --success-green: #38A169;
      }
      body {
        margin: 0;
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: radial-gradient(circle at center, #2e3034 0%, #1a1d1f 100%); 
        font-family: 'Inter', sans-serif;
        color: white;
        text-align: center;
        overflow: hidden;
      }
      
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
        background: rgba(35, 39, 42, 0.8);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(100, 100, 100, 0.2);
        padding: 40px 30px;
        border-radius: 16px;
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        text-align: center;
        max-width: 90%;
        width: 350px;
        animation: fadeIn 1s ease-in-out;
      }
      
      .icon-container {
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
        font-weight: 800;
        color: white;
      }
      
      p {
        margin: 0;
        font-size: 1rem;
        color: #B9BBBE;
        font-weight: 400;
      }
      
      .close-text {
        margin-top: 25px;
        font-size: 0.9rem;
        color: #72767D;
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
      <div class="icon-container">
        <!-- Modern Checkmark SVG -->
        <svg class="icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      
      <h1>Verification Success!</h1>
      <p>Thank you for verifying using the Zerxys panel.</p>
      <p class="close-text">You can safely close this window now.</p>
    </div>
  </body>
  </html>
`);
  } catch (err) {
    console.error("Verification Error:", err.message);
    res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verification Error</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
        <style>
          body {
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #1a1d1f;
            color: white;
            font-family: 'Inter', sans-serif;
            text-align: center;
          }
          .error-card {
            background: rgba(45, 20, 20, 0.8);
            border: 1px solid rgba(255, 0, 0, 0.3);
            padding: 40px 30px;
            border-radius: 16px;
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5);
            max-width: 90%;
            width: 350px;
          }
          h1 { color: #f44336; margin-top: 0; }
          p { color: #ccc; }
        </style>
      </head>
      <body>
        <div class="error-card">
          <h1>❌ Verification Failed</h1>
          <p>An error occurred during the Discord verification process.</p>
          <p>Please try again or check your logs for details.</p>
        </div>
      </body>
      </html>
    `);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});