import "dotenv/config";
import express from "express";
import { fileURLToPath } from "url";
import { connect } from "./db/connection.js";
import firesRouter from "./routes/fires.js";

const app = express();
const PORT = process.env.PORT || 3000; // Render sets PORT
const FRONTEND_DIR = fileURLToPath(new URL("../frontend", import.meta.url));

app.use(express.json());
app.use(express.static(FRONTEND_DIR));
app.use("/api/fires", firesRouter);

// FOR /API/FIRES
// TODO(Rajvi): mount /api/fires here, from backend/routes/fires.js
// Cap results with ?limit= (default 100, max 500) using .limit() in Mongo
// Don't pass 0 or NaN: .limit(0) returns all 197,970 docs
// Sort on an indexed field (_id) and project only the fields the UI uses

await connect();
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
