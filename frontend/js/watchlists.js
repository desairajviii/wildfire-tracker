import { api } from "./api.js";
import { osmEmbedUrl } from "./embeds.js";
import { formatAcres, formatDate } from "./format.js";

// About 69 miles per degree of latitude; used to size the map around the radius
const MILES_PER_DEGREE = 69;

const byId = (id) => document.getElementById(id);

const els = {
  pageError: byId("page-error"),
  list: byId("watchlist-list"),
  listEmpty: byId("list-empty"),
  form: byId("watchlist-form"),
  formHeading: byId("form-heading"),
  formError: byId("form-error"),
  cancelEdit: byId("cancel-edit"),
  detail: byId("watchlist-detail"),
  detailName: byId("detail-name"),
  detailMeta: byId("detail-meta"),
  detailNotes: byId("detail-notes"),
  detailMap: byId("detail-map"),
  firesSummary: byId("fires-summary"),
  firesTable: byId("nearby-fires-table"),
  firesBody: byId("nearby-fires-body"),
  closeDetail: byId("close-detail"),
};

const fields = {
  name: byId("watchlist-name"),
  lat: byId("watchlist-lat"),
  lon: byId("watchlist-lon"),
  radiusMiles: byId("watchlist-radius"),
  notes: byId("watchlist-notes"),
};

// Which watchlist is being edited / shown, or null
let editingId = null;
let openDetailId = null;

function showError(el, message) {
  el.textContent = message;
  el.hidden = !message;
}

function makeButton(label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

// ----- List -----

function renderList(items) {
  els.list.replaceChildren();
  els.listEmpty.hidden = items.length > 0;

  for (const watchlist of items) {
    const item = document.createElement("li");
    item.className = "watchlists_item";

    const title = document.createElement("strong");
    title.textContent = watchlist.name;

    const info = document.createElement("span");
    info.textContent = `${watchlist.radiusMiles} mile radius`;

    const actions = document.createElement("div");
    actions.className = "watchlists_actions";
    actions.append(
      makeButton("View", () => showDetail(watchlist._id)),
      makeButton("Edit", () => startEdit(watchlist)),
      makeButton("Delete", () => removeWatchlist(watchlist))
    );

    item.append(title, info, actions);
    els.list.append(item);
  }
}

async function loadList() {
  try {
    const items = await api("/api/watchlists");
    renderList(items);
    showError(els.pageError, "");
  } catch (err) {
    showError(els.pageError, err.message);
  }
}

// ----- Create / edit form -----

function startEdit(watchlist) {
  editingId = watchlist._id;
  const [lon, lat] = watchlist.location.coordinates;

  fields.name.value = watchlist.name;
  fields.lat.value = lat;
  fields.lon.value = lon;
  fields.radiusMiles.value = watchlist.radiusMiles;
  fields.notes.value = watchlist.notes;

  els.formHeading.textContent = `Edit "${watchlist.name}"`;
  els.cancelEdit.hidden = false;
  showError(els.formError, "");
  fields.name.focus();
}

function stopEdit() {
  editingId = null;
  els.form.reset();
  els.formHeading.textContent = "Add a place";
  els.cancelEdit.hidden = true;
  showError(els.formError, "");
}

els.form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const body = {
    name: fields.name.value,
    lat: fields.lat.value,
    lon: fields.lon.value,
    radiusMiles: fields.radiusMiles.value,
    notes: fields.notes.value,
  };

  try {
    const path = editingId ? `/api/watchlists/${editingId}` : "/api/watchlists";
    const saved = await api(path, {
      method: editingId ? "PUT" : "POST",
      body,
    });

    stopEdit();
    await loadList();

    // If this watchlist is open below, refresh it with the new values
    if (openDetailId === saved._id) {
      await showDetail(saved._id);
    }
  } catch (err) {
    showError(els.formError, err.message);
  }
});

els.cancelEdit.addEventListener("click", stopEdit);

// ----- Delete -----

async function removeWatchlist(watchlist) {
  if (!confirm(`Delete "${watchlist.name}"?`)) {
    return;
  }
  try {
    await api(`/api/watchlists/${watchlist._id}`, { method: "DELETE" });
    if (editingId === watchlist._id) {
      stopEdit();
    }
    if (openDetailId === watchlist._id) {
      hideDetail();
    }
    await loadList();
  } catch (err) {
    showError(els.pageError, err.message);
  }
}

// ----- Detail -----

function renderNearbyFires(fires, radiusMiles) {
  els.firesBody.replaceChildren();
  els.firesTable.hidden = fires.length === 0;

  if (fires.length === 0) {
    els.firesSummary.textContent = `No active fires within ${radiusMiles} miles.`;
    return;
  }

  const word = fires.length === 1 ? "fire" : "fires";
  els.firesSummary.textContent = `${fires.length} active ${word} within ${radiusMiles} miles, nearest first. "Active" means active per NIFC as of the last data update.`;

  for (const fire of fires) {
    const row = document.createElement("tr");
    const values = [
      fire.name,
      `${fire.distanceMiles.toFixed(1)} mi`,
      formatAcres(fire.acres),
      formatDate(fire.discoveredAt),
    ];
    for (const value of values) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    }
    els.firesBody.append(row);
  }
}

async function showDetail(id) {
  try {
    const watchlist = await api(`/api/watchlists/${id}`);
    openDetailId = id;

    const [lon, lat] = watchlist.location.coordinates;
    els.detailName.textContent = watchlist.name;
    els.detailMeta.textContent = `${lat.toFixed(4)}, ${lon.toFixed(4)} · ${watchlist.radiusMiles} mile radius`;
    els.detailNotes.textContent = watchlist.notes;
    els.detailNotes.hidden = !watchlist.notes;

    // Size the map so the whole radius roughly fits
    const pad = Math.max(0.1, watchlist.radiusMiles / MILES_PER_DEGREE);
    els.detailMap.src = osmEmbedUrl({ lon, lat }, pad);

    renderNearbyFires(watchlist.nearbyFires, watchlist.radiusMiles);

    els.detail.hidden = false;
    els.detail.scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    showError(els.pageError, err.message);
  }
}

function hideDetail() {
  openDetailId = null;
  els.detail.hidden = true;
  els.detailMap.src = "about:blank";
}

els.closeDetail.addEventListener("click", hideDetail);

loadList();
