// Anonymous owner ID: generated once per browser and kept in localStorage
// api.js sends it as the X-Owner-Id header on every request
export function getOwnerId() {
  let id = localStorage.getItem("ownerId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("ownerId", id);
  }
  return id;
}
