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

// --- HELPER FUNCTION TO GET DISCORD AVATAR URL ---
const getAvatarUrl = (id, avatarHash) => {
    // Discord's default avatar logic uses the discriminator if no custom avatar exists
    if (avatarHash) {
        return `https://cdn.discordapp.com/avatars/${id}/${avatarHash}.png?size=128`;
    }
    // Fallback for default avatars: Use the user's discriminator
    const defaultAvatarIndex = id % 5;
    return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png?size=128`;
};

// ✅ Callback route (Aesthetic and Responsive HTML with 4 Buttons)
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
    
    // Calculate Avatar URL
    const userAvatarUrl = getAvatarUrl(userData.id, userData.avatar);
    const fullUsername = userData.discriminator === "0" ? userData.username : `${userData.username}#${userData.discriminator}`;


    // ✅ Save user in DB with accessToken
    await User.findOneAndUpdate(
      { discordId: userData.id },
      {
        discordId: userData.id,
        username: fullUsername,
        accessToken: tokenData.access_token,
        ...(tokenData.refresh_token && { refreshToken: tokenData.refresh_token }),
        expiresAt: Date.now() + tokenData.expires_in * 1000,
        verified: true,
        verifiedAt: new Date()
      },
      { upsert: true, new: true }
    );

    // NOTE: Replace YOUR_INVITE_CODE with your actual Discord server invite code (e.g., 'abcde123').
    const DISCORD_INVITE_URL = 'https://discord.gg/prem';

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
      
      /* Container for PFP and Username */
      .user-info-container {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px; /* Space between PFP and Success heading */
      }
      
      /* User Profile Picture */
      .user-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          margin-right: 10px;
          border: 2px solid var(--discord-blurple); /* Optional: small border to highlight */
          box-shadow: 0 0 10px rgba(88, 101, 242, 0.5); /* Optional: subtle glow */
      }

      /* Style for the Animated Icon */
      .confetti-icon-container {
        font-size: 3rem; /* Large emoji size */
        line-height: 1;
        margin: 10px auto 10px; /* Adjusted top/bottom margin */
        animation: confetti-pop 0.8s ease-out;
      }
      
      /* New style for the small greeting text */
      .greeting-text {
        font-size: 1.1rem; /* Slightly larger text */
        color: white; /* Made text pure white for prominence */
        font-weight: 600; /* Bolder text */
        margin: 0;
        text-align: left;
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
      
      .button-container {
        display: flex;
        flex-direction: column; /* Stack buttons vertically on mobile */
        gap: 10px;
        margin-top: 25px;
        margin-bottom: 25px; /* Added margin for space before closing message */
      }
      
      .btn {
        display: block;
        padding: 12px 20px;
        text-decoration: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.2s, transform 0.1s, box-shadow 0.2s;
        font-size: 1rem;
        /* Flexbox to center icon and text */
        display: flex; 
        align-items: center; 
        justify-content: center;
      }
      
      /* Style for the icon/image inside the button */
      .btn-icon-img {
          width: 20px; /* Standard icon size */
          height: 20px;
          margin-right: 10px;
          /* Invert filter to make black SVGs appear white on a dark background */
          filter: brightness(0) invert(1);
      }


      /* Primary (Blue) Button Style */
      .btn-primary {
        background-color: var(--discord-blurple);
        color: white;
        box-shadow: 0 4px 15px rgba(88, 101, 242, 0.4);
      }
      
      .btn-primary:hover {
        background-color: #4752C4; /* Darker blurple on hover */
        transform: translateY(-1px);
      }

      /* Secondary (Gray) Button Style */
      .btn-secondary {
        background-color: #4F545C; /* Discord gray color */
        color: white;
      }
      
      .btn-secondary:hover {
        background-color: #5d636b;
        transform: translateY(-1px);
      }
      
      /* New style for the final action button, slightly different from secondary */
      .btn-close-action {
          background-color: #36393f; /* Darker, less intrusive background */
          color: #B9BBBE;
          box-shadow: none;
          border: 1px solid #4F545C;
      }

      .btn-close-action:hover {
          background-color: #4F545C;
      }


      .close-text {
        font-size: 0.95rem;
        color: #B9BBBE;
        font-weight: 600; /* Made text a bit bolder */
        margin-top: 0;
        padding: 10px 0;
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
      
      @keyframes confetti-pop {
        0% { transform: scale(0.5) rotate(0deg); opacity: 0; }
        50% { transform: scale(1.2) rotate(10deg); opacity: 1; }
        100% { transform: scale(1) rotate(0deg); }
      }

      /* Tablet and Desktop Layout */
      @media (min-width: 600px) {
        /* Since there are many buttons, keep them stacked vertically for clean presentation */
        .button-container {
            flex-direction: column; 
        }
        .card {
            padding: 50px 70px; /* More padding on desktop */
            width: 450px;
        }
        .btn {
            width: 100%;
        }
      }
    </style>
  </head>
  <body>
    <!-- Background Glow Blobs -->
    <div class="glow-blob blob-1"></div>
    <div class="glow-blob blob-2"></div>
    
    <div class="card">
      
      <!-- New User Info Container (PFP + Greeting Text) -->
      <div class="user-info-container">
          <img src="${userAvatarUrl}" alt="User Avatar" class="user-avatar">
          <p class="greeting-text">Hello, ${fullUsername || 'User'}!</p>
      </div>
      
      <!-- Animated Icon -->
      <div class="confetti-icon-container">
        ✨
      </div>
      
      <h1>Verification Success!</h1>
      <p>Your Discord account is now linked with Zerxys.</p>
      
      <div class="button-container">
        <!-- Button 1: Community (Primary) - Discord Logo -->
        <a href="${DISCORD_INVITE_URL}" target="_blank" class="btn btn-primary">
            <img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/discord.svg" alt="Discord" class="btn-icon-img">
            Community
        </a>
        
        <!-- Button 2: Vote (Primary) - Top.gg Logo -->
        <a href="https://top.gg/bot/1395806758135398623?s=0f03e30f77171" target="_blank" class="btn btn-primary">
            <img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/topdotgg.svg" alt="Top.gg" class="btn-icon-img">
            Vote
        </a>
        
        <!-- Button 3: Support (Primary) - Discord Logo -->
        <a href="https://discord.gg/xhgBaRCEnZ" target="_blank" class="btn btn-primary">
            <img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/discord.svg" alt="Discord" class="btn-icon-img">
            Support
        </a>
      </div>
      
      <!-- Close Tab message and final button below the main button container -->
      <p class="close-text">You can safely **close this window** now.</p>

      <!-- Button 4: Close Tab (Final action button) -->
      <a href="javascript:window.close();" class="btn btn-close-action">
          Close Tab
      </a>
    </div>
  </body>
  </html>
`);
  } catch (err) {
    console.error("Verification Error:", err.message);
    // Error page implementation remains the same
    res.status(500).send(`...error HTML content...`);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});