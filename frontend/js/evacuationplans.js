// Evacuation plans page js script
// lists the owner's plans, handles the create/edit form, copies and regenerates share links
// requests go through api(), which adds the owner ID
import { api } from "./api.js";
import { makeButton, showError } from "./dom.js";

// constants match server
const MAX_ROUTES = 5;
const MAX_CONTACTS = 10;
const SHARE_PAGE = "sharedplan.html";

const byId = (id) => document.getElementById(id);

// page elements
const els = {
  pageError: byId("page-error"),
  pageStatus: byId("page-status"),
  list: byId("plan-list"),
  listEmpty: byId("list-empty"),
  form: byId("plan-form"),
  formHeading: byId("form-heading"),
  formError: byId("form-error"),
  saveButton: byId("save-plan"),
  cancelEdit: byId("cancel-edit"),
  routesList: byId("routes-list"),
  addRoute: byId("add-route"),
  contactsList: byId("contacts-list"),
  addContact: byId("add-contact"),
};

// fixed form fields
const fields = {
  householdName: byId("plan-household"),
  meetingPoint: byId("plan-meeting"),
};

let editingId = null; // ID of the plan being edited

// function to show messges
function showStatus(message) {
  els.pageStatus.textContent = ""; // reset
  requestAnimationFrame(() => {
    els.pageStatus.textContent = message; // set on the next frame
  });
}

// function to build the full share url for a plan
function shareUrl(plan) {
  const url = new URL(SHARE_PAGE, location.href);
  url.searchParams.set("code", plan.shareCode);
  return url.href;
}

// helper function  to fix singular vs plural
function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

// function to create a text input for a route/contact row
function makeInput(value, maxLength, placeholder, required) {
  const input = document.createElement("input");
  input.value = value;
  input.maxLength = maxLength; // same as server limit
  input.placeholder = placeholder;
  input.required = required; // required check on submit
  return input;
}

// Route and contact rows

// function to renumber labels and enable/disable row buttons after any add/remove
function updateRows() {
  const routeRows = [...els.routesList.children]; // current route rows
  routeRows.forEach((row, i) => {
    row.querySelector("input").setAttribute("aria-label", `Route ${i + 1}`);
    const remove = row.querySelector("button"); // remove button
    remove.setAttribute("aria-label", `Remove route ${i + 1}`); // removed route
    remove.disabled = routeRows.length === 1; // a plan must have at least one route
  });
  els.addRoute.disabled = routeRows.length >= MAX_ROUTES; // stop at server limit

  const contactRows = [...els.contactsList.children]; // current contact rows
  contactRows.forEach((row, i) => {
    row
      .querySelector('[data-field="name"]')
      .setAttribute("aria-label", `Contact ${i + 1} name`);
    row
      .querySelector('[data-field="relation"]')
      .setAttribute("aria-label", `Contact ${i + 1} relation`);
    row
      .querySelector("button")
      .setAttribute("aria-label", `Remove contact ${i + 1}`);
  });
  els.addContact.disabled = contactRows.length >= MAX_CONTACTS; // stop at server limit
}

// function to remove a row and move focus
function removeRow(row, focusTarget) {
  row.remove();
  updateRows(); // renumber and re-enable add button
  focusTarget.focus(); // move keyboard focus
}

// function to add one route row
// returns the new row
function addRouteRow(value = "") {
  const row = document.createElement("li");
  row.className = "evacuation_row";
  row.append(
    makeInput(value, 200, "e.g. Hwy 50 east to Placerville", true), // route text
    makeButton(
      "Remove",
      () => removeRow(row, els.addRoute),
      "button_secondary button_small"
    )
  );
  els.routesList.append(row);
  updateRows(); // label and update button states
  return row;
}

// function to add one contact row
// returns the new row
function addContactRow({ name = "", relation = "" } = {}) {
  const row = document.createElement("li");
  row.className = "evacuation_row evacuation_row-contact";

  const nameInput = makeInput(name, 100, "Name", true); // contact name
  nameInput.dataset.field = "name";
  const relationInput = makeInput(relation, 50, "Relation", false); // relation is optional
  relationInput.dataset.field = "relation";

  row.append(
    nameInput,
    relationInput,
    makeButton(
      "Remove",
      () => removeRow(row, els.addContact),
      "button_secondary button_small"
    )
  );
  els.contactsList.append(row);
  updateRows(); // label and update button states
  return row;
}

// function to rebuild all rows from a plan when editing or blank when creating
function resetRows(plan) {
  els.routesList.replaceChildren(); // clear old route rows
  els.contactsList.replaceChildren(); // clear old contact rows
  for (const route of plan?.routes ?? [""]) {
    addRouteRow(route); // add one row per saved route or one blank row
  }
  for (const contact of plan?.contacts ?? []) {
    addContactRow(contact); // add one row per saved contact
  }
}

// function to structure form for API
function readForm() {
  return {
    householdName: fields.householdName.value,
    meetingPoint: fields.meetingPoint.value,
    routes: [...els.routesList.querySelectorAll("input")].map(
      (input) => input.value
    ),
    contacts: [...els.contactsList.children].map((row) => ({
      name: row.querySelector('[data-field="name"]').value,
      relation: row.querySelector('[data-field="relation"]').value,
    })),
  };
}

// focus the new input when a row is added by the button
els.addRoute.addEventListener("click", () =>
  addRouteRow().querySelector("input").focus()
);
els.addContact.addEventListener("click", () =>
  addContactRow().querySelector("input").focus()
);

// List

// function to draw the plan list
function renderList(plans) {
  els.list.replaceChildren(); // clear old list
  els.listEmpty.hidden = plans.length > 0; // empty-state message

  for (const plan of plans) {
    const item = document.createElement("li");
    item.className = "evacuation_item";

    const title = document.createElement("strong"); // household name
    title.className = "evacuation_item-name";
    title.textContent = plan.householdName;

    const info = document.createElement("span"); // meeting point and counts
    info.className = "evacuation_item-info";
    info.textContent = `Meet at ${plan.meetingPoint}. ${plural(plan.routes.length, "route")}, ${plural(plan.contacts.length, "contact")}.`;

    const actions = document.createElement("div"); // plan buttons
    actions.className = "evacuation_actions";
    actions.append(
      makeButton(
        "Edit",
        () => startEdit(plan),
        "button_secondary button_small"
      ),
      makeButton("Copy share link", () => copyShareLink(plan), "button_small"),
      makeButton(
        "New share link",
        () => regenerateLink(plan),
        "button_secondary button_small"
      ),
      makeButton("Delete", () => removePlan(plan), "button_danger button_small")
    );

    item.append(title, info, actions);
    els.list.append(item);
  }
}

// function to fetch owner's plans and render them
// sorted by newest to olderst
async function loadList() {
  try {
    const plans = await api("/api/evacuation-plans"); // ownerId is stripped
    renderList(plans);
    showError(els.pageError, ""); // clear any previoous error
  } catch (err) {
    showError(els.pageError, err.message);
  }
}

// Create/edit form

// function to fill form with a plan and switch to edit mode
function startEdit(plan) {
  editingId = plan._id;
  fields.householdName.value = plan.householdName;
  fields.meetingPoint.value = plan.meetingPoint;
  resetRows(plan); // rebuild route and contact rows from the plan

  els.formHeading.textContent = `Edit "${plan.householdName}"`;
  els.saveButton.textContent = "Save changes";
  els.cancelEdit.hidden = false; // allow leaving edit mode
  showError(els.formError, "");
  fields.householdName.focus(); // move focus to form on phones
}

// function to clear form and reset to create mode
function stopEdit() {
  editingId = null;
  els.form.reset(); // clear fixed fields
  resetRows();
  els.formHeading.textContent = "Create a plan";
  els.saveButton.textContent = "Save plan";
  els.cancelEdit.hidden = true;
  showError(els.formError, "");
}

// submit form and refresh the list
els.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const wasEditing = editingId !== null;

  try {
    const path = wasEditing
      ? `/api/evacuation-plans/${editingId}`
      : "/api/evacuation-plans";
    await api(path, { method: wasEditing ? "PUT" : "POST", body: readForm() });

    stopEdit(); // reset form
    await loadList(); // show saved plan
    showStatus(
      wasEditing
        ? "Plan updated."
        : "Plan created. Use Copy share link to send it to family."
    );
  } catch (err) {
    showError(els.formError, err.message);
  }
});

els.cancelEdit.addEventListener("click", stopEdit);

// Share links

// function to copy a plan's share link to the clipboard
async function copyShareLink(plan) {
  const url = shareUrl(plan);
  try {
    await navigator.clipboard.writeText(url); // throws if unavailable or blocked
    showStatus(`Share link for "${plan.householdName}" copied.`);
  } catch {
    showStatus(`Couldn't copy automatically. Share this link: ${url}`);
  }
}

// function to replace a plan's share code
async function regenerateLink(plan) {
  if (
    !confirm(
      `Make a new share link for "${plan.householdName}"? The old link will stop working.`
    )
  ) {
    return; // cancel
  }
  try {
    await api(`/api/evacuation-plans/${plan._id}/share-code`, {
      method: "PATCH",
    });
    await loadList(); // list items now hold the new share code
    showStatus(
      `New share link ready for "${plan.householdName}". The old link no longer works.`
    );
  } catch (err) {
    showError(els.pageError, err.message);
  }
}

// Delete

// Function to delete a plan
async function removePlan(plan) {
  if (
    !confirm(
      `Delete "${plan.householdName}"? Its share link will stop working.`
    )
  ) {
    return; // cancel
  }
  try {
    await api(`/api/evacuation-plans/${plan._id}`, { method: "DELETE" });
    if (editingId === plan._id) {
      stopEdit();
    }
    await loadList();
    showStatus("Plan deleted.");
  } catch (err) {
    showError(els.pageError, err.message);
  }
}

resetRows();
loadList();
