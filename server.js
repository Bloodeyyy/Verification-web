import express from "express";
import dotenv from "dotenv";

dotenv.config();
const app = express();

const PORT = process.env.PORT || 3000;

// Home page
app.get("/", (req, res) => {
  res.send("✅ Verification Website is Running!");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});