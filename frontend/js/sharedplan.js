// Shared evacuation plan page js script
// loads one plan by the share code and shows it read-only
// the shared route doesn't need an owner id
import { api } from "./api.js";
import { showError } from "./dom.js";
import { formatDate } from "./format.js";

// shown for a missing/mistyped/regenerated/deleted link
const NOT_FOUND =
  "This link doesn't work. The plan may have been deleted or given a new link.";
const byId = (id) => document.getElementById(id);

// page elements
const els = {
  title: byId("plan-title"),
  loading: byId("plan-loading"),
  error: byId("plan-error"),
  plan: byId("plan"),
  meeting: byId("plan-meeting"),
  routes: byId("plan-routes"),
  contacts: byId("plan-contacts"),
  noContacts: byId("plan-no-contacts"),
  meta: byId("plan-meta"),
  print: byId("print-plan"),
};

// function to fill a list with one <li> per text item
function fillList(list, items) {
  list.replaceChildren(
    ...items.map((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      return item;
    })
  );
}

// function to format a contact as "Name (relation)"  or just the name
function contactText({ name, relation }) {
  return relation ? `${name} (${relation})` : name;
}

// function to render plan
function renderPlan(plan) {
  els.title.textContent = `Evacuation plan: ${plan.householdName}`;
  document.title = `${plan.householdName} evacuation plan | Wildfire Tracker`; // header
  els.meeting.textContent = plan.meetingPoint;
  fillList(els.routes, plan.routes);
  fillList(els.contacts, plan.contacts.map(contactText));
  els.contacts.hidden = plan.contacts.length === 0; // hide empty list
  els.noContacts.hidden = plan.contacts.length > 0; // show "No contacts listed." if no contacts
  els.meta.textContent = `Created ${formatDate(plan.createdAt)}. This is a read-only copy; only the plan's owner can change it.`;
  els.loading.hidden = true;
  els.plan.hidden = false;
}

// function to show an error instead of the plan
function showProblem(message) {
  els.loading.hidden = true;
  showError(els.error, message);
}

// function to read the share code from the URL and fetch the plan
async function loadPlan() {
  const code = new URLSearchParams(location.search).get("code"); // ?code=<shareCode>
  if (!code) {
    showProblem(NOT_FOUND); // no code, skip the request
    return;
  }
  try {
    const plan = await api(
      `/api/evacuation-plans/shared/${encodeURIComponent(code)}`
    );
    renderPlan(plan);
  } catch (err) {
    showProblem(err.message === "Plan not found" ? NOT_FOUND : err.message);
  }
}

els.print.addEventListener("click", () => window.print());
loadPlan();
