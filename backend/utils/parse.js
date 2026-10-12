// Helper functions to parse request input

// converts form values to numbers for validation
// empty or missing values become NaN so they fail validation
// (Number("") would otherwise be 0, a real coordinate)
export function toNumber(value) {
  if (value === undefined || value === null || value === "") {
    return NaN;
  }
  return Number(value);
}

// function that returns trimmed string value or "" if the value isn't a string
export function toText(value) {
  return typeof value === "string" ? value.trim() : "";
}

// converts "YYYY-MM-DD" string into Date
// returns null if missing or invalid
export function toDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(value);
  // Impossible dates roll over ("2026-02-30" becomes Mar 2), so they won't match the input
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
    ? date
    : null;
}

// function to check if value is within range
// returns true if yes
export function inRange(value, min, max) {
  return Number.isFinite(value) && value >= min && value <= max;
}
