import { api } from "./api.js";
import { osmEmbedUrl } from "./embeds.js";
import { makeButton, showError } from "./dom.js";
import { renderNearbyFires, mapPadForMiles } from "./nearbyFires.js";

const byId = (id) => document.getElementById(id);

// Page elements
const els = {
  pageError: byId("page-error"),
  list: byId("trip-list"),
  listEmpty: byId("list-empty"),
  form: byId("trip-form"),
  formHeading: byId("form-heading"),
  formError: byId("form-error"),
  cancelEdit: byId("cancel-edit"),
  detail: byId("trip-detail"),
  detailName: byId("detail-name"),
  detailMeta: byId("detail-meta"),
  detailNotes: byId("detail-notes"),
  detailMap: byId("detail-map"),
  firesSummary: byId("fires-summary"),
  firesTable: byId("nearby-fires-table"),
  firesBody: byId("nearby-fires-body"),
  closeDetail: byId("close-detail"),
};

// form inputs
const fields = {
  trailName: byId("trip-name"),
  lat: byId("trip-lat"),
  lon: byId("trip-lon"),
  startDate: byId("trip-start"),
  endDate: byId("trip-end"),
  bufferMiles: byId("trip-buffer"),
  notes: byId("trip-notes"),
};

// Track which trip is being edited/shown, or null
let editingId = null;
let openDetailId = null;

// Formats one trip date for display
// Trip dates are stored as UTC midnight, so format them in UTC.
// formatDate() uses local time, which would show the day before in US time zones.
function formatTripDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Formats a trip's date range
function formatTripDates(trip) {
  const start = formatTripDate(trip.startDate);
  const end = formatTripDate(trip.endDate);
  return start === end ? start : `${start} – ${end}`;
}

const toDateInput = (iso) => iso.slice(0, 10); // convert to "2026-10-20", the format <input type="date"> needs

// Function to rebuild the trip list (name, dates, nearby fire count, and action buttons per trip)
function renderList(items) {
  els.list.replaceChildren(); // clear old rows
  els.listEmpty.hidden = items.length > 0; // show empty message when there are no trips

  // build one row per trip
  for (const trip of items) {
    const item = document.createElement("li");
    item.className = "trips_item";

    // trail name
    const title = document.createElement("strong");
    title.className = "trips_item-name";
    title.textContent = trip.trailName;

    // trip info (dates, nearby fire count)
    const info = document.createElement("span");
    info.className = "trips_item-info";
    const count = document.createElement("span");
    const word = trip.nearbyFireCount === 1 ? "fire" : "fires";
    count.textContent = `${trip.nearbyFireCount} active ${word} nearby`;
    // if there are fires nearby, embed color
    if (trip.nearbyFireCount > 0) {
      count.className = "status_active";
    }
    info.append(`${formatTripDates(trip)} · `, count);

    // view, edit, delete buttons
    const actions = document.createElement("div");
    actions.className = "trips_actions";
    actions.append(
      makeButton(
        "View",
        () => showDetail(trip._id),
        "button_secondary button_small"
      ),
      makeButton(
        "Edit",
        () => startEdit(trip),
        "button_secondary button_small"
      ),
      makeButton("Delete", () => removeTrip(trip), "button_danger button_small")
    );

    item.append(title, info, actions);
    els.list.append(item);
  }
}

// function to fetch the user's trips and render them
// shows a page error on failure
async function loadList() {
  try {
    const items = await api("/api/trip-plans");
    renderList(items);
    showError(els.pageError, "");
  } catch (err) {
    showError(els.pageError, err.message);
  }
}

// Today as "YYYY-MM-DD" in the user's own time zone (en-CA prints dates that way)
const todayInput = () => new Date().toLocaleDateString("en-CA");

// Sets the earliest dates the pickers allow:
// start can't be before `earliest` (today by default), and end can't be
// before the chosen start date
function syncDateLimits(earliest = todayInput()) {
  fields.startDate.min = earliest;
  fields.endDate.min = fields.startDate.value || earliest;
}

// When the start date changes, re-limit the end date (keep the same earliest start)
fields.startDate.addEventListener("change", () =>
  syncDateLimits(fields.startDate.min)
);

syncDateLimits(); // apply the limits as soon as the page loads

// Function to switch the form to edit mode
// fills the form with trip values
function startEdit(trip) {
  editingId = trip._id;
  const [lon, lat] = trip.location.coordinates;

  fields.trailName.value = trip.trailName;
  fields.lat.value = lat;
  fields.lon.value = lon;
  fields.startDate.value = toDateInput(trip.startDate);
  fields.endDate.value = toDateInput(trip.endDate);
  fields.bufferMiles.value = trip.bufferMiles;
  fields.notes.value = trip.notes;
  // An existing past trip can keep its own start date; new dates still can't be past
  const ownStart = toDateInput(trip.startDate);
  syncDateLimits(ownStart < todayInput() ? ownStart : todayInput());

  // show the trip being edited
  els.formHeading.textContent = `Edit "${trip.trailName}"`;
  els.cancelEdit.hidden = false;
  showError(els.formError, "");
  fields.trailName.focus();
}

// clears inputs, heading, cancel, and errors
function stopEdit() {
  editingId = null;
  els.form.reset();
  syncDateLimits(); // back to today as the earliest start
  els.formHeading.textContent = "Add a trip";
  els.cancelEdit.hidden = true;
  showError(els.formError, "");
}

// save the form
els.form.addEventListener("submit", async (event) => {
  event.preventDefault(); // stop the browser's page-reloading submit

  const body = {
    trailName: fields.trailName.value,
    lat: fields.lat.value,
    lon: fields.lon.value,
    startDate: fields.startDate.value,
    endDate: fields.endDate.value,
    bufferMiles: fields.bufferMiles.value,
    notes: fields.notes.value,
  };

  try {
    const path = editingId ? `/api/trip-plans/${editingId}` : "/api/trip-plans";
    const saved = await api(path, {
      method: editingId ? "PUT" : "POST",
      body,
    });

    stopEdit(); // reset form for next trip
    await loadList();

    // If this trip is open below, refresh it with the new values
    if (openDetailId === saved._id) {
      await showDetail(saved._id);
    }
  } catch (err) {
    showError(els.formError, err.message); // show validation errors
  }
});

// leave edit mode without saving
els.cancelEdit.addEventListener("click", stopEdit);

// function to delete a trip after confirming
async function removeTrip(trip) {
  if (!confirm(`Delete "${trip.trailName}"?`)) {
    return;
  }
  try {
    await api(`/api/trip-plans/${trip._id}`, { method: "DELETE" });
    if (editingId === trip._id) {
      stopEdit();
    }
    if (openDetailId === trip._id) {
      hideDetail();
    }
    await loadList();
  } catch (err) {
    showError(els.pageError, err.message);
  }
}

// Function to load one trip and show its details, map, and nearby fires
async function showDetail(id) {
  try {
    const trip = await api(`/api/trip-plans/${id}`);
    openDetailId = id;

    const [lon, lat] = trip.location.coordinates;
    els.detailName.textContent = trip.trailName; // heading
    els.detailMeta.textContent = `${formatTripDates(trip)}. Trailhead at latitude ${lat.toFixed(4)}, longitude ${lon.toFixed(4)}. Checking ${trip.bufferMiles} miles around it.`;
    // Notes are hidden when empty
    els.detailNotes.textContent = trip.notes;
    els.detailNotes.hidden = !trip.notes;

    // Point iframe at trailhead, sized so the whole buffer roughly fits
    els.detailMap.src = osmEmbedUrl(
      { lon, lat },
      mapPadForMiles(trip.bufferMiles)
    );

    // fill nearby fires table
    renderNearbyFires(
      { summary: els.firesSummary, table: els.firesTable, body: els.firesBody },
      trip.nearbyFires,
      trip.bufferMiles
    );

    // show the section and scroll to it
    els.detail.hidden = false;
    els.detail.scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    // show failure message at top of page
    showError(els.pageError, err.message);
  }
}

// function to close the detail section and unload the map
function hideDetail() {
  openDetailId = null;
  els.detail.hidden = true;
  els.detailMap.src = "about:blank";
}

// hide details section
els.closeDetail.addEventListener("click", hideDetail);

loadList();
