// Shared display helpers. Null values show "Unknown", never 0 or a blank.

export function formatAcres(acres) {
  return acres === null ? "Unknown" : acres.toLocaleString("en-US");
}

export function formatDate(iso) {
  if (!iso) {
    return "Unknown";
  }
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatContained(percent) {
  return percent === null ? "Unknown" : `${percent}%`;
}
