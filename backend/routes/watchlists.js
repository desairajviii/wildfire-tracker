import express from "express";
import { requireOwner, stripOwner } from "../middleware/owner.js";
import { findFiresNear } from "../db/fireQueries.js";
import {
  createWatchlist,
  listWatchlists,
  getWatchlist,
  updateWatchlist,
  deleteWatchlist,
} from "../db/watchlists.js";

const router = express.Router();

// Every watchlist route needs the owner ID
router.use(requireOwner);

const MAX_RADIUS_MILES = 500;

// Empty strings and missing values become NaN, so they fail the checks
// (otherwise Number("") would quietly become 0, a real coordinate)
function toNumber(value) {
  if (value === undefined || value === null || value === "") {
    return NaN;
  }
  return Number(value);
}

// Checks the form data and turns it into what we store.
// Returns { errors } if something is wrong, otherwise { data }.
function parseWatchlist(body = {}) {
  const errors = [];

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 100) {
    errors.push("Name is required (up to 100 characters).");
  }

  const lat = toNumber(body.lat);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    errors.push("Latitude must be between -90 and 90.");
  }

  const lon = toNumber(body.lon);
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    errors.push("Longitude must be between -180 and 180.");
  }

  const radiusMiles = toNumber(body.radiusMiles);
  if (
    !Number.isFinite(radiusMiles) ||
    radiusMiles <= 0 ||
    radiusMiles > MAX_RADIUS_MILES
  ) {
    errors.push(`Radius must be between 1 and ${MAX_RADIUS_MILES} miles.`);
  }

  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  if (notes.length > 1000) {
    errors.push("Notes can be up to 1000 characters.");
  }

  if (errors.length > 0) {
    return { errors };
  }

  return {
    data: {
      name,
      // GeoJSON order is [lon, lat]
      location: { type: "Point", coordinates: [lon, lat] },
      radiusMiles,
      notes,
    },
  };
}

// Catches unexpected errors so every route returns { error } instead of crashing
function withErrors(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Something went wrong" });
    }
  };
}

// GET /api/watchlists: the owner's watchlists
router.get(
  "/",
  withErrors(async (req, res) => {
    const items = await listWatchlists(req.ownerId);
    res.json(items.map(stripOwner));
  })
);

// POST /api/watchlists: create one
router.post(
  "/",
  withErrors(async (req, res) => {
    const { errors, data } = parseWatchlist(req.body);
    if (errors) {
      return res.status(400).json({ error: errors.join(" ") });
    }
    const watchlist = await createWatchlist(req.ownerId, data);
    res.status(201).json(stripOwner(watchlist));
  })
);

// GET /api/watchlists/:id: one watchlist plus active fires within its radius
router.get(
  "/:id",
  withErrors(async (req, res) => {
    const watchlist = await getWatchlist(req.ownerId, req.params.id);
    if (!watchlist) {
      return res.status(404).json({ error: "Watchlist not found" });
    }
    const [lon, lat] = watchlist.location.coordinates;
    const nearbyFires = await findFiresNear(
      { lon, lat },
      watchlist.radiusMiles
    );
    res.json({ ...stripOwner(watchlist), nearbyFires });
  })
);

// PUT /api/watchlists/:id: update one
router.put(
  "/:id",
  withErrors(async (req, res) => {
    const { errors, data } = parseWatchlist(req.body);
    if (errors) {
      return res.status(400).json({ error: errors.join(" ") });
    }
    const updated = await updateWatchlist(req.ownerId, req.params.id, data);
    if (!updated) {
      return res.status(404).json({ error: "Watchlist not found" });
    }
    res.json(stripOwner(updated));
  })
);

// DELETE /api/watchlists/:id: delete one
router.delete(
  "/:id",
  withErrors(async (req, res) => {
    const deleted = await deleteWatchlist(req.ownerId, req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Watchlist not found" });
    }
    res.status(204).end();
  })
);

export default router;
