import { api } from "./api.js";
import { osmEmbedUrl } from "./embeds.js";
import { formatAcres, formatDate, formatContained } from "./format.js";
import { showError } from "./dom.js";
import { setupReports } from "./reports.js";

const fireId = new URLSearchParams(location.search).get("id");

const els = {
  name: document.getElementById("fire-name"),
  pageError: document.getElementById("page-error"),
  missing: document.getElementById("fire-missing"),
  content: document.getElementById("fire-content"),
  details: document.getElementById("fire-details"),
  map: document.getElementById("fire-map"),
};

function addDetail(term, value, className = "") {
  const dt = document.createElement("dt");
  dt.textContent = term;
  const dd = document.createElement("dd");
  dd.textContent = value;
  dd.className = className;
  els.details.append(dt, dd);
}

function showMissing(message) {
  els.name.textContent = "Fire not available";
  els.missing.textContent = message;
  els.missing.hidden = false;
}

async function loadFire() {
  if (!fireId) {
    showMissing("No fire was selected. Choose one from the fire list.");
    return;
  }

  try {
    const fire = await api(`/api/fires/${encodeURIComponent(fireId)}`);

    document.title = `${fire.name} | Wildfire Tracker`;
    els.name.textContent = fire.name;

    els.details.replaceChildren();
    addDetail(
      "Status",
      fire.isActive ? "Active" : "Inactive",
      fire.isActive ? "status_active" : "status_inactive"
    );
    addDetail("State", fire.state ?? "Unknown");
    addDetail("Acres", formatAcres(fire.acres));
    addDetail("Discovered", formatDate(fire.discoveredAt));
    addDetail("Contained", formatContained(fire.percentContained));

    const [lon, lat] = fire.location.coordinates;
    addDetail("Location", `${lat.toFixed(4)}, ${lon.toFixed(4)}`);
    els.map.src = osmEmbedUrl({ lon, lat }, 0.15);

    els.content.hidden = false;
    setupReports(fire._id);
  } catch (err) {
    if (err.status === 404) {
      showMissing(
        "This fire is no longer in the dataset. The data refreshes regularly, and fires older than five years drop out."
      );
    } else {
      els.name.textContent = "Couldn't load this fire";
      showError(els.pageError, err.message);
    }
  }
}

loadFire();
