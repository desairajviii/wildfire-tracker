import "dotenv/config";
import express from "express";
import { fileURLToPath } from "url";
import { connect } from "./db/connection.js";
import firesRouter from "./routes/fires.js";
import watchlistsRouter from "./routes/watchlists.js";
import tripPlansRouter from "./routes/tripplans.js";

const app = express();
const PORT = process.env.PORT || 3000; // Render sets PORT
const FRONTEND_DIR = fileURLToPath(new URL("../frontend", import.meta.url));

app.use(express.json());
app.use(express.static(FRONTEND_DIR));
app.use("/api/fires", firesRouter);
app.use("/api/watchlists", watchlistsRouter);
app.use("/api/trip-plans", tripPlansRouter);

await connect();
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
