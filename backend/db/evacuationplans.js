// Evacuation plan CRUD db module
import { randomUUID } from "crypto";
import { getDb } from "./connection.js";
import { toObjectId } from "./ids.js";

// get the evacuationPlans collection
const plans = () => getDb().collection("evacuationPlans");

// function to create the unique index on shareCode
// fast share-link lookups and no two plans can share a code
// call once at startup, after connect()
export async function ensureEvacuationPlanIndexes() {
  await plans().createIndex({ shareCode: 1 }, { unique: true }); // duplicate codes are rejected
}

// function to create a plan
// takes in owner id and data (validated fields from the route)
export async function createEvacuationPlan(ownerId, data) {
  const doc = {
    ownerId, // tie the plan to its creator
    ...data, // validated fields (householdName, meetingPoint, routes, contacts...)
    shareCode: randomUUID(), // random code for the read-only share link
    createdAt: new Date(), // creation timestamp
  };
  const result = await plans().insertOne(doc); // save the plan
  return { _id: result.insertedId, ...doc }; // return the plan with its new ID
}

// function to list the owner's plans, newest first
export async function listEvacuationPlans(ownerId) {
  return plans()
    .find({ ownerId }) // only this owner's plans
    .sort({ createdAt: -1 }) // newest first
    .toArray(); // load results into an array
}

// function to get one plan
// returns null if the ID is invalid or the plan belongs to someone else
export async function getEvacuationPlan(ownerId, id) {
  const _id = toObjectId(id);
  if (!_id) {
    return null;
  }
  return plans().findOne({ _id, ownerId });
}

// function to update one plan
// returns the updated plan, or null if not found
export async function updateEvacuationPlan(ownerId, id, data) {
  const _id = toObjectId(id);
  if (!_id) {
    return null;
  }
  return plans().findOneAndUpdate(
    { _id, ownerId },
    { $set: data }, // overwrite the edited fields
    { returnDocument: "after" } // return the plan after the update
  );
}

// function to delete one plan
// returns true if a plan was deleted, false otherwise
export async function deleteEvacuationPlan(ownerId, id) {
  const _id = toObjectId(id);
  if (!_id) {
    return false;
  }
  const result = await plans().deleteOne({ _id, ownerId });
  return result.deletedCount === 1; // true if exactly one plan was removed
}

// function to get a plan for the read-only shared view
// looked up by share code
export async function getSharedEvacuationPlan(shareCode) {
  return plans().findOne({ shareCode }); // null if no plan has this code
}

// function to replace a plan's share code - the old link stops working
// returns the updated plan, or null if not found
export async function regenerateShareCode(ownerId, id) {
  const _id = toObjectId(id);
  if (!_id) {
    return null;
  }
  return plans().findOneAndUpdate(
    { _id, ownerId },
    { $set: { shareCode: randomUUID() } }, // new random code
    { returnDocument: "after" } // return the plan with the new code
  );
}
