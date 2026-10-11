// Helper function to parse request input
// converts form values to numbers for validation
// empty or missing values become NaN so they fail validation
export function toNumber(value) {
  if (value === undefined || value === null || value === "") {
    return NaN;
  }
  return Number(value);
}