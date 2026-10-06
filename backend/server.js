import "dotenv/config";
import express from "express";
import { fileURLToPath } from "url";
import { connect, getDb } from "./db/connection.js";

const app = express();
const PORT = process.env.PORT || 3000; // Render sets PORT
const FRONTEND_DIR = fileURLToPath(new URL("../frontend", import.meta.url));

app.use(express.json());
app.use(express.static(FRONTEND_DIR));

// Temporary: verifies DB connection and seed. REMOVE once api/fires is live
// NOTE: DO NOT REMOVE UNTIL RENDER HEALTH CHECK PATH IS UPDATED
app.get("/api/health", async (req, res) => {
  const total = await getDb().collection("fires").countDocuments();
  res.json({ ok: true, total });
});


// FOR /API/FIRES
// TODO(Rajvi): mount /api/fires here, from backend/routes/fires.js
// Cap results with ?limit= (default 100, max 500) using .limit() in Mongo
// Don't pass 0 or NaN: .limit(0) returns all 197,970 docs
// Sort on an indexed field (_id) and project only the fields the UI uses
// Please let me know when it's deployed so I can update the Render health check path

await connect();
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
