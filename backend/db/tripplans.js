// Trip Plans CRUD
// Every query is scoped to ownerId so each user only sees their own trip

import { getDb } from "./connection.js";
import { toObjectId } from "./ids.js";

// retrieve the tripPlans collection
const tripPlans = () => getDb().collection("tripPlans");

// function to insert a new trip plan for the owner
// returns the plan with a generated id
export async function createTripPlan(ownerId, data) {
  const doc = { ownerId, ...data, createdAt: new Date() };
  const result = await tripPlans().insertOne(doc); // metadata
  return { _id: result.insertedId, ...doc }; // rebuild the full record for the route
}

// function that returns all owner's trip plans, sorted by most immediate
// takes in the ownerId
export async function listTripPlans(ownerId) {
  return tripPlans().find({ ownerId }).sort({ startDate: 1 }).toArray();
}

// Function that returns a trip plan
// takes in ownerId, trip plan id
export async function getTripPlan(ownerId, id) {
  const _id = toObjectId(id);
  // return null if id isn't valid
  if (!_id) {
    return null;
  }
  return tripPlans().findOne({ _id, ownerId });
}

// Function that updates the given fields on one of the owner's trip plans
// returns the updated plan or null if invalid id is passed/no matching plan exists
export async function updateTripPlan(ownerId, id, data) {
  const _id = toObjectId(id);
  if (!_id) {
    return null;
  }
  return tripPlans().findOneAndUpdate(
    { _id, ownerId },
    { $set: data }, // change only the given field
    { returnDocument: "after" } // return the updated document or null
  );
}

// Function to delete a trip plan
// returns true if delete is successful, false otherwise
export async function deleteTripPlan(ownerId, id) {
  const _id = toObjectId(id);
  if (!_id) {
    return false;
  }

  const result = await tripPlans().deleteOne({ _id, ownerId });
  return result.deletedCount === 1;
}
