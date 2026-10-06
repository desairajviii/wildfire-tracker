// Shared fetch helper. Every page calls the backend through api(), never fetch() directly,
// so the owner ID header and error handling live in one place.
import { getOwnerId } from "./owner.js";

/**
 * Calls the backend and returns the parsed response.
 *
 * @param {string} path - e.g. "/api/trip-plans" or "/api/fires?state=CA&page=2"
 *   (build query strings with URLSearchParams)
 * @param {{ method?: string, body?: object }} [options] - method defaults to "GET";
 *   body is a plain object, sent as JSON
 * @returns {Promise<any>} the parsed JSON body, or null for 204 No Content
 * @throws {Error} carrying the server's { error } message when the status isn't 2xx
 *
 * Usage:
 *   const page = await api("/api/fires?active=true");
 *   const saved = await api("/api/trip-plans", { method: "POST", body: trip });
 *   await api(`/api/trip-plans/${id}`, { method: "DELETE" });
 */
export async function api(path, { method = "GET", body } = {}) {
  // TODO:
  // 1. Headers: always send X-Owner-Id: getOwnerId() (harmless on public routes; the
  //    optional ones use it for isMine). Add Content-Type: application/json only when
  //    there is a body.
  // 2. fetch(path, { method, headers, body: JSON.stringify(body) when body is present }).
  // 3. 204 No Content (deletes): return null, there is no body to parse.
  // 4. Parse the JSON body. If parsing fails (e.g. an HTML 404 from a mistyped path),
  //    fall back to an error built from res.status.
  // 5. If !res.ok: throw new Error(data.error || `Request failed (${res.status})`).
  //    Pages catch it and show the message to the user.
  // 6. Return the parsed data.
}
