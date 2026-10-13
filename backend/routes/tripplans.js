// Trip plans routes
import express from "express";
import { requireOwner, stripOwner } from "../middleware/owner.js";
import { findFiresNear } from "../db/fireQueries.js";
import {
  createTripPlan,
  listTripPlans,
  getTripPlan,
  updateTripPlan,
  deleteTripPlan,
} from "../db/tripplans.js";
import { toNumber, toText, toDate, inRange } from "../utils/parse.js";
import { withErrors } from "../utils/withErrors.js";

const router = express.Router();
router.use(requireOwner);
const MAX_BUFFER_MILES = 500;
const DAY_MS = 24 * 60 * 60 * 1000;

// Earliest start date accepted for a new trip: yesterday (UTC midnight).
// The extra day keeps users in other time zones from being rejected for "today"
function earliestStartDate() {
  const date = new Date(Date.now() - DAY_MS);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

// Function to check the form data convert it for storing
// returns { errors } if conversion/validation fails, otherwise { data }
function parseTripPlan(body = {}) {
  const trailName = toText(body.trailName);
  const lat = toNumber(body.lat);
  const lon = toNumber(body.lon);
  const startDate = toDate(body.startDate);
  const endDate = toDate(body.endDate);
  const bufferMiles = toNumber(body.bufferMiles);
  const notes = toText(body.notes);

  const errors = [
    (!trailName || trailName.length > 100) &&
      "Trail name is required (up to 100 characters).",
    !inRange(lat, -90, 90) && "Latitude must be between -90 and 90.",
    !inRange(lon, -180, 180) && "Longitude must be between -180 and 180.",
    (!startDate || !endDate) && "Start and end dates are required.",
    startDate &&
      endDate &&
      endDate < startDate &&
      "End date must be on or after the start date.",
    !inRange(bufferMiles, 1, MAX_BUFFER_MILES) &&
      `Buffer must be between 1 and ${MAX_BUFFER_MILES} miles.`,
    notes.length > 1000 && "Notes can be up to 1000 characters.",
  ].filter(Boolean);

  if (errors.length > 0) {
    return { errors };
  }

  return {
    data: {
      trailName,
      location: { type: "Point", coordinates: [lon, lat] },
      startDate,
      endDate,
      bufferMiles,
      notes,
    },
  };
}

// function that returns acitve fires within the trip's buffer, in the order
// of closest ot farthest
function firesNearTrip(trip) {
  const [lon, lat] = trip.location.coordinates;
  return findFiresNear({ lon, lat }, trip.bufferMiles);
}

// GET /api/trip-plans - the owner's trips with a count of nearby fires
router.get(
  "/",
  withErrors(async (req, res) => {
    const trips = await listTripPlans(req.ownerId);
    // One $geoNear query per trip, run in parallel
    const fireLists = await Promise.all(trips.map(firesNearTrip));
    res.json(
      trips.map((trip, i) => ({
        ...stripOwner(trip),
        nearbyFireCount: fireLists[i].length,
      }))
    );
  })
);

// POST /api/trip-plans - create
router.post(
  "/",
  withErrors(async (req, res) => {
    const { errors, data } = parseTripPlan(req.body);
    if (errors) {
      return res.status(400).json({ error: errors.join(" ") });
    }
    // New trips can't start in the past (edits are exempt so old trips stay editable)
    if (data.startDate < earliestStartDate()) {
      return res
        .status(400)
        .json({ error: "Start date can't be in the past." });
    }
    const trip = await createTripPlan(req.ownerId, data);
    res.status(201).json(stripOwner(trip));
  })
);

// GET /api/trip-plans/:id -  one trip with active fires within its buffer
router.get(
  "/:id",
  withErrors(async (req, res) => {
    const trip = await getTripPlan(req.ownerId, req.params.id);
    if (!trip) {
      return res.status(404).json({ error: "Trip plan not found" });
    }
    const nearbyFires = await firesNearTrip(trip);
    res.json({ ...stripOwner(trip), nearbyFires });
  })
);

// PUT /api/trip-plans/:id - update
router.put(
  "/:id",
  withErrors(async (req, res) => {
    const { errors, data } = parseTripPlan(req.body);
    if (errors) {
      return res.status(400).json({ error: errors.join(" ") });
    }
    const updated = await updateTripPlan(req.ownerId, req.params.id, data);
    if (!updated) {
      return res.status(404).json({ error: "Trip plan not found" });
    }
    res.json(stripOwner(updated));
  })
);

// DELETE /api/trip-plans/:id -  delete
router.delete(
  "/:id",
  withErrors(async (req, res) => {
    const deleted = await deleteTripPlan(req.ownerId, req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Trip plan not found" });
    }
    res.status(204).end();
  })
);

export default router;
