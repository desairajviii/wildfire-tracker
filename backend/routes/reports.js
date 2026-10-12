import express from "express";
import {
  requireOwner,
  optionalOwner,
  withIsMine,
} from "../middleware/owner.js";
import { toText } from "../utils/parse.js";
import { withErrors } from "../utils/withErrors.js";
import {
  createReport,
  listReportsForFire,
  getReport,
  updateReport,
  deleteReport,
  fireExists,
} from "../db/reports.js";

const router = express.Router();

const REPORT_TYPES = ["smoke", "road_closure", "evacuation", "other"];
const MAX_DESCRIPTION = 1000;

// Checks the type and description. Returns { errors } or { data }.
// The fire a report belongs to can't be changed after it's created.
function parseReport(body = {}) {
  const errors = [];

  const type = toText(body.type);
  if (!REPORT_TYPES.includes(type)) {
    errors.push(
      "Choose a report type: smoke, road closure, evacuation, or other."
    );
  }

  const description = toText(body.description);
  if (!description || description.length > MAX_DESCRIPTION) {
    errors.push(
      `Description is required (up to ${MAX_DESCRIPTION} characters).`
    );
  }

  if (errors.length > 0) {
    return { errors };
  }
  return { data: { type, description } };
}

// GET /api/reports?fireId=...: public list for one fire
router.get(
  "/",
  optionalOwner,
  withErrors(async (req, res) => {
    const fireId = toText(req.query.fireId).toUpperCase();
    if (!fireId) {
      return res.status(400).json({ error: "fireId is required" });
    }
    const items = await listReportsForFire(fireId);
    res.json(items.map((report) => withIsMine(report, req.ownerId)));
  })
);

// GET /api/reports/:id: public, one report
router.get(
  "/:id",
  optionalOwner,
  withErrors(async (req, res) => {
    const report = await getReport(req.params.id);
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }
    res.json(withIsMine(report, req.ownerId));
  })
);

// POST /api/reports: create (needs owner ID)
router.post(
  "/",
  requireOwner,
  withErrors(async (req, res) => {
    const { errors, data } = parseReport(req.body);
    if (errors) {
      return res.status(400).json({ error: errors.join(" ") });
    }

    const fireId = toText(req.body?.fireId).toUpperCase();
    if (!fireId) {
      return res.status(400).json({ error: "fireId is required" });
    }
    if (!(await fireExists(fireId))) {
      return res.status(404).json({ error: "Fire not found" });
    }

    const report = await createReport(req.ownerId, { fireId, ...data });
    res.status(201).json(withIsMine(report, req.ownerId));
  })
);

// PUT /api/reports/:id: author only
router.put(
  "/:id",
  requireOwner,
  withErrors(async (req, res) => {
    const { errors, data } = parseReport(req.body);
    if (errors) {
      return res.status(400).json({ error: errors.join(" ") });
    }
    const updated = await updateReport(req.ownerId, req.params.id, data);
    if (!updated) {
      return res.status(404).json({ error: "Report not found" });
    }
    res.json(withIsMine(updated, req.ownerId));
  })
);

// DELETE /api/reports/:id: author only
router.delete(
  "/:id",
  requireOwner,
  withErrors(async (req, res) => {
    const deleted = await deleteReport(req.ownerId, req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Report not found" });
    }
    res.status(204).end();
  })
);

export default router;
