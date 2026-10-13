import express from "express";
import { requireOwner, stripOwner } from "../middleware/owner.js";
import {
  createEvacuationPlan,
  listEvacuationPlans,
  getEvacuationPlan,
  updateEvacuationPlan,
  deleteEvacuationPlan,
  getSharedEvacuationPlan,
  regenerateShareCode,
} from "../db/evacuationplans.js";
import { toText } from "../utils/parse.js";
import { withErrors } from "../utils/withErrors.js";

const router = express.Router();
const MAX_ROUTES = 5;
const MAX_CONTACTS = 10;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// function to check the form data and convert it for storage
// returns { errors } if something is wrong, otherwise { data }
function parseEvacuationPlan(body = {}) {
  const errors = [];

  const householdName = toText(body.householdName); // trimmed household name
  if (!householdName || householdName.length > 100) {
    errors.push("Household name is required (up to 100 characters)."); // throw error if empty or too long
  }

  const meetingPoint = toText(body.meetingPoint); // trimmed meeting point
  if (!meetingPoint || meetingPoint.length > 200) {
    errors.push("Meeting point is required (up to 200 characters)."); // throw error if empty or too long
  }

  // trim each route and drop blank entries
  const routes = (Array.isArray(body.routes) ? body.routes : [])
    .map(toText)
    .filter(Boolean);

  if (routes.length === 0 || routes.length > MAX_ROUTES) {
    errors.push(`Add between 1 and ${MAX_ROUTES} evacuation routes.`); // none or too many
  } else if (routes.some((route) => route.length > 200)) {
    errors.push("Each route can be up to 200 characters."); // one route is too long
  }

  // trim contact/relation, drop blank rows
  const contacts = (Array.isArray(body.contacts) ? body.contacts : [])
    .map((contact) => ({
      name: toText(contact?.name),
      relation: toText(contact?.relation),
    }))
    .filter((contact) => contact.name || contact.relation);

  if (contacts.length > MAX_CONTACTS) {
    errors.push(`Add up to ${MAX_CONTACTS} contacts.`); // too many contacts
  }
  if (contacts.some((contact) => !contact.name || contact.name.length > 100)) {
    errors.push("Each contact needs a name (up to 100 characters)."); // relation without a name, or name is too long
  }
  if (contacts.some((contact) => contact.relation.length > 50)) {
    errors.push("Each relation can be up to 50 characters."); // relation too long
  }

  if (errors.length > 0) {
    return { errors }; // reject - the route returns 400
  }

  // a client can't set ownerId or shareCode
  return { data: { householdName, meetingPoint, routes, contacts } };
}

// GET /api/evacuation-plans/shared/:shareCode
// read-only shared view, no owner ID needed
router.get(
  "/shared/:shareCode",
  withErrors(async (req, res) => {
    const shareCode = req.params.shareCode.toLowerCase(); // codes are stored lowercase
    if (!UUID.test(shareCode)) {
      return res.status(404).json({ error: "Plan not found" }); // invalid code: skip the query
    }
    const plan = await getSharedEvacuationPlan(shareCode); // look up by share code
    if (!plan) {
      return res.status(404).json({ error: "Plan not found" }); // no plan or link was regenerated
    }
    res.json(stripOwner(plan)); // hide ownerId on the public route
  })
);

// ownerID is needed for routes below
router.use(requireOwner);

// GET /api/evacuation-plans: the owner's plans
router.get(
  "/",
  withErrors(async (req, res) => {
    const plans = await listEvacuationPlans(req.ownerId);
    res.json(plans.map(stripOwner)); // remove ownerId from each plan
  })
);

// POST /api/evacuation-plans: create a plan
router.post(
  "/",
  withErrors(async (req, res) => {
    const { errors, data } = parseEvacuationPlan(req.body); // validate the form data
    if (errors) {
      return res.status(400).json({ error: errors.join(" ") });
    }
    const plan = await createEvacuationPlan(req.ownerId, data); // save with a new share code
    res.status(201).json(stripOwner(plan));
  })
);

// GET /api/evacuation-plans/:id: retrieve a plan
router.get(
  "/:id",
  withErrors(async (req, res) => {
    const plan = await getEvacuationPlan(req.ownerId, req.params.id);
    if (!plan) {
      return res.status(404).json({ error: "Plan not found" }); // invalid ID
    }
    res.json(stripOwner(plan));
  })
);

// PUT /api/evacuation-plans/:id: update a plan
router.put(
  "/:id",
  withErrors(async (req, res) => {
    const { errors, data } = parseEvacuationPlan(req.body); // validate the form data
    if (errors) {
      return res.status(400).json({ error: errors.join(" ") });
    }
    const updated = await updateEvacuationPlan(
      req.ownerId,
      req.params.id,
      data
    );
    if (!updated) {
      return res.status(404).json({ error: "Plan not found" }); // invalid ID
    }
    res.json(stripOwner(updated));
  })
);

// PATCH /api/evacuation-plans/:id/share-code: new share code - the old link stops working
router.patch(
  "/:id/share-code",
  withErrors(async (req, res) => {
    const updated = await regenerateShareCode(req.ownerId, req.params.id);
    if (!updated) {
      return res.status(404).json({ error: "Plan not found" }); // invalid ID
    }
    res.json(stripOwner(updated)); // plan with its new code
  })
);

// DELETE /api/evacuation-plans/:id: delete a plan
router.delete(
  "/:id",
  withErrors(async (req, res) => {
    const deleted = await deleteEvacuationPlan(req.ownerId, req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Plan not found" }); // invalid ID
    }
    res.status(204).end();
  })
);

export default router;
