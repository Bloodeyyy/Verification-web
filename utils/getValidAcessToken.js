const axios = require("axios");
const User = require("./models/User.js");

async function getValidAccessToken(user) {
  // Check if token is still valid
  if (user.expiresAt && user.expiresAt > Date.now()) {
    return user.accessToken;
  }

  // Otherwise refresh using refresh_token
  try {
    const response = await axios.post(
      "https://discord.com/api/oauth2/token",
      new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: user.refreshToken,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const data = response.data;

    // Update DB with new token
    user.accessToken = data.access_token;
    user.expiresAt = Date.now() + data.expires_in * 1000;
    if (data.refresh_token) user.refreshToken = data.refresh_token; // sometimes Discord gives new refresh_token
    await user.save();

    return user.accessToken;
  } catch (err) {
    console.error("Failed to refresh token:", err.response?.data || err.message);
    return null;
  }
}

module.exports = getValidAccessToken;