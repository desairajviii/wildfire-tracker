import express from "express";
import { getDb } from "../db/connection.js";

const router = express.Router();

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

// Turns "3" into 3; anything invalid falls back to the default
function toPositiveInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

// GET /api/fires?state=CA&active=true&page=1&limit=25
router.get("/", async (req, res) => {
  try {
    const db = getDb();
    const page = toPositiveInt(req.query.page, 1);
    const limit = Math.min(
      toPositiveInt(req.query.limit, DEFAULT_LIMIT),
      MAX_LIMIT
    );

    const filter = {};
    if (req.query.state) {
      filter.state = String(req.query.state).toUpperCase();
    }
    if (req.query.active === "true") {
      filter.isActive = true;
    } else if (req.query.active === "false") {
      filter.isActive = false;
    }

    const fires = db.collection("fires");
    const meta = await db.collection("meta").findOne({ _id: "seed" });
    const hasFilter = Object.keys(filter).length > 0;

    // Counting 198k records on every request is slow, so use the
    // seed's saved total when there are no filters
    const totalPromise = hasFilter
      ? fires.countDocuments(filter)
      : (meta?.total ?? fires.estimatedDocumentCount());

    const [items, total] = await Promise.all([
      fires
        .find(filter)
        .sort({ discoveredAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      totalPromise,
    ]);

    res.json({ items, total, page, limit, seededAt: meta?.seededAt ?? null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load fires" });
  }
});

// GET /api/fires/:id
router.get("/:id", async (req, res) => {
  try {
    const fire = await getDb()
      .collection("fires")
      .findOne({ _id: req.params.id.toUpperCase() });

    if (!fire) {
      return res.status(404).json({ error: "Fire not found" });
    }
    res.json(fire);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load fire" });
  }
});

export default router;
