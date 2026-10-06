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
app.get("/api/health", async (req, res) => {
  const total = await getDb().collection("fires").countDocuments();
  res.json({ ok: true, total });
});
// Route modules are added here as they're written, e.g.:
// app.use("/api/fires", firesRouter);

await connect();
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
