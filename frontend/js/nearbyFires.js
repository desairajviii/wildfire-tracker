import { formatAcres, formatContained, formatDate } from "./format.js";
import { makeFireLink } from "./dom.js";

// About 69 miles per degree of latitude
const MILES_PER_DEGREE = 69;

// How far (in degrees) a map should show so the whole radius roughly fits
export function mapPadForMiles(miles) {
  return Math.max(0.1, miles / MILES_PER_DEGREE);
}

// Fills a nearby-fires summary and table. Used by watchlists and trip plans.
// els: { summary, table, body }
export function renderNearbyFires(els, fires, miles) {
  els.body.replaceChildren();
  els.table.hidden = fires.length === 0;

  if (fires.length === 0) {
    els.summary.textContent = `No active fires within ${miles} miles.`;
    return;
  }

  const word = fires.length === 1 ? "fire" : "fires";
  els.summary.textContent = `${fires.length} active ${word} within ${miles} miles, nearest first. "Active" means active per NIFC as of the last data update.`;

  for (const fire of fires) {
    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    nameCell.append(makeFireLink(fire));
    row.append(nameCell);

    const values = [
      `${fire.distanceMiles.toFixed(1)} mi`,
      formatAcres(fire.acres),
      formatContained(fire.percentContained),
      formatDate(fire.discoveredAt),
    ];
    for (const value of values) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    }
    els.body.append(row);
  }
}
