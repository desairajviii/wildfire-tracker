import { getDb } from "./connection.js";

const METERS_PER_MILE = 1609.34;

/**
 * Finds fires within radiusMiles of a point, nearest first.
 * Requires the 2dsphere index on fires.location (created by the seed).
 *
 * @param {{ lon: number, lat: number }} point - always an object, never [lon, lat]
 * @param {number} radiusMiles
 * @param {{ activeOnly?: boolean }} [options] - activeOnly defaults to true
 * @returns {Promise<object[]>} fires in the fires schema, each with distanceMiles added
 */
export function findFiresNear(
  { lon, lat },
  radiusMiles,
  { activeOnly = true } = {}
) {
  return getDb()
    .collection("fires")
    .aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lon, lat] },
          distanceField: "distanceMiles",
          distanceMultiplier: 1 / METERS_PER_MILE,
          maxDistance: radiusMiles * METERS_PER_MILE,
          query: activeOnly ? { isActive: true } : {},
        },
      },
    ])
    .toArray();
}
