import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import axios from "axios";
import User from "./models/User.js"; // jo model banaya tha usko import karo

dotenv.config();
const app = express();

const PORT = process.env.PORT || 3000;

// =============== MongoDB Connect ===============
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.error("❌ MongoDB Error:", err));

// =============== Home Route ===============
app.get("/", (req, res) => {
  res.send("✅ Verification Website is Running!");
});

// =============== OAuth2 Redirect ===============
app.get("/login", (req, res) => {
  const redirectUri = encodeURIComponent(process.env.REDIRECT_URI);
  res.redirect(
    `https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=identify%20guilds.join`
  );
});

// =============== OAuth2 Callback ===============
app.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send("❌ No code provided!");

  try {
    // Get access token from Discord
    const tokenResponse = await axios.post(
      "https://discord.com/api/oauth2/token",
      new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.REDIRECT_URI,
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const { access_token, token_type } = tokenResponse.data;

    // Get user info
    const userResponse = await axios.get("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `${token_type} ${access_token}`,
      },
    });

    const user = userResponse.data;

    // Save user in DB
    await User.findOneAndUpdate(
      { discordId: user.id },
      { username: user.username, discriminator: user.discriminator },
      { upsert: true, new: true }
    );

    res.send(`✅ Verified as ${user.username}#${user.discriminator}`);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.send("❌ Verification failed!");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});