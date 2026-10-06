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
  // 1. Owner ID on every request; JSON header only when sending a body
  const headers = { "X-Owner-Id": getOwnerId() };
  const options = { method, headers };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  // 2. Make the request
  const res = await fetch(path, options);

  // 3. Deletes return 204 with no body
  if (res.status === 204) {
    return null;
  }

  // 4. Parse JSON; an HTML error page (like a mistyped path) won't parse
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Request failed (${res.status})`);
  }

  // 5. Turn server errors into a thrown Error with the server's message
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }

  // 6. Success
  return data;
}
