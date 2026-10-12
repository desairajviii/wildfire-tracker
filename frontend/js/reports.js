import { api } from "./api.js";
import { formatDate } from "./format.js";
import { makeButton, showError } from "./dom.js";

const TYPE_LABELS = {
  smoke: "Smoke",
  road_closure: "Road closure",
  evacuation: "Evacuation",
  other: "Other",
};

// Sets up the reports list and form for one fire
export function setupReports(fireId) {
  const els = {
    error: document.getElementById("reports-error"),
    list: document.getElementById("reports-list"),
    empty: document.getElementById("reports-empty"),
    formHeading: document.getElementById("report-form-heading"),
    form: document.getElementById("report-form"),
    type: document.getElementById("report-type"),
    description: document.getElementById("report-description"),
    formError: document.getElementById("report-form-error"),
    submit: document.getElementById("report-submit"),
    cancel: document.getElementById("report-cancel"),
  };

  // The report being edited, or null when posting a new one
  let editingId = null;

  function renderReport(report) {
    const item = document.createElement("li");
    item.className = "reports_item";

    const meta = document.createElement("div");
    meta.className = "reports_meta";

    const type = document.createElement("strong");
    type.textContent = TYPE_LABELS[report.type] ?? "Other";

    const date = document.createElement("span");
    date.className = "note";
    date.textContent = report.updatedAt
      ? `${formatDate(report.createdAt)}, edited`
      : formatDate(report.createdAt);

    const badge = document.createElement("span");
    badge.className = "reports_badge";
    badge.textContent = "Unverified";

    meta.append(type, date, badge);

    const text = document.createElement("p");
    text.className = "reports_text";
    text.textContent = report.description;

    item.append(meta, text);

    // Only the author sees Edit and Delete
    if (report.isMine) {
      const actions = document.createElement("div");
      actions.className = "reports_actions";
      actions.append(
        makeButton(
          "Edit",
          () => startEdit(report),
          "button_secondary button_small"
        ),
        makeButton(
          "Delete",
          () => removeReport(report),
          "button_danger button_small"
        )
      );
      item.append(actions);
    }

    return item;
  }

  async function loadReports() {
    try {
      const reports = await api(
        `/api/reports?fireId=${encodeURIComponent(fireId)}`
      );
      els.list.replaceChildren(...reports.map(renderReport));
      els.list.hidden = reports.length === 0;
      els.empty.hidden = reports.length > 0;
      showError(els.error, "");
    } catch (err) {
      showError(els.error, err.message);
    }
  }

  function startEdit(report) {
    editingId = report._id;
    els.type.value = report.type;
    els.description.value = report.description;
    els.formHeading.textContent = "Edit your report";
    els.submit.textContent = "Save changes";
    els.cancel.hidden = false;
    showError(els.formError, "");
    els.description.focus();
  }

  function stopEdit() {
    editingId = null;
    els.form.reset();
    els.formHeading.textContent = "Post a report";
    els.submit.textContent = "Post report";
    els.cancel.hidden = true;
    showError(els.formError, "");
  }

  async function removeReport(report) {
    if (!confirm("Delete your report?")) {
      return;
    }
    try {
      await api(`/api/reports/${report._id}`, { method: "DELETE" });
      if (editingId === report._id) {
        stopEdit();
      }
      await loadReports();
    } catch (err) {
      showError(els.error, err.message);
    }
  }

  els.form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const body = {
      type: els.type.value,
      description: els.description.value,
    };

    try {
      if (editingId) {
        await api(`/api/reports/${editingId}`, { method: "PUT", body });
      } else {
        await api("/api/reports", {
          method: "POST",
          body: { fireId, ...body },
        });
      }
      stopEdit();
      await loadReports();
    } catch (err) {
      showError(els.formError, err.message);
    }
  });

  els.cancel.addEventListener("click", stopEdit);

  loadReports();
}
