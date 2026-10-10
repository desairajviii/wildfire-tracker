import { api } from "./api.js";
import { formatAcres, formatDate, formatContained } from "./format.js";

const PAGE_SIZE = 25;

// What the user has picked right now
const current = { page: 1, stateCode: "", activeOnly: false };

const els = {
  summary: document.getElementById("fires-summary"),
  form: document.getElementById("fire-filters"),
  stateInput: document.getElementById("state-filter"),
  activeInput: document.getElementById("active-filter"),
  error: document.getElementById("fires-error"),
  body: document.getElementById("fires-body"),
  prev: document.getElementById("prev-page"),
  next: document.getElementById("next-page"),
  pageInfo: document.getElementById("page-info"),
};

function renderRows(fires) {
  els.body.replaceChildren();

  if (fires.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.className = "table_empty";
    cell.textContent = "No fires match these filters.";
    row.append(cell);
    els.body.append(row);
    return;
  }

  for (const fire of fires) {
    const row = document.createElement("tr");
    const values = [
      fire.name,
      fire.state ?? "Unknown",
      formatAcres(fire.acres),
      formatDate(fire.discoveredAt),
      formatContained(fire.percentContained),
      fire.isActive ? "Active" : "Inactive",
    ];
    for (const value of values) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    }
    row.lastElementChild.className = fire.isActive
      ? "status_active"
      : "status_inactive";
    els.body.append(row);
  }
}

async function loadFires() {
  const params = new URLSearchParams({ page: current.page, limit: PAGE_SIZE });
  if (current.stateCode) {
    params.set("state", current.stateCode);
  }
  if (current.activeOnly) {
    params.set("active", "true");
  }

  els.error.hidden = true;
  els.summary.textContent = "Loading fires…";

  try {
    const data = await api(`/api/fires?${params}`);
    renderRows(data.items);

    const totalPages = Math.max(1, Math.ceil(data.total / data.limit));
    const asOf = data.seededAt
      ? `as of ${formatDate(data.seededAt)}`
      : "(data date unknown)";

    els.summary.textContent = `${data.total.toLocaleString("en-US")} fires, ${asOf}. "Active" means active per NIFC.`;
    els.pageInfo.textContent = `Page ${data.page} of ${totalPages.toLocaleString("en-US")}`;
    els.prev.disabled = data.page <= 1;
    els.next.disabled = data.page >= totalPages;
  } catch (err) {
    els.summary.textContent = "";
    els.error.textContent = err.message;
    els.error.hidden = false;
  }
}

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  current.stateCode = els.stateInput.value.trim().toUpperCase();
  current.activeOnly = els.activeInput.checked;
  current.page = 1;
  loadFires();
});

els.form.addEventListener("reset", () => {
  current.stateCode = "";
  current.activeOnly = false;
  current.page = 1;
  loadFires();
});

els.prev.addEventListener("click", () => {
  current.page -= 1;
  loadFires();
});

els.next.addEventListener("click", () => {
  current.page += 1;
  loadFires();
});

loadFires();
