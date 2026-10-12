import { getDb } from "./connection.js";
import { toObjectId } from "./ids.js";

const reports = () => getDb().collection("reports");

export async function createReport(ownerId, data) {
  const doc = { ownerId, ...data, createdAt: new Date() };
  const result = await reports().insertOne(doc);
  return { _id: result.insertedId, ...doc };
}

// Public: everyone's reports for one fire, newest first
export async function listReportsForFire(fireId) {
  return reports().find({ fireId }).sort({ createdAt: -1 }).toArray();
}

// Public: any report by ID
export async function getReport(id) {
  const _id = toObjectId(id);
  if (!_id) {
    return null;
  }
  return reports().findOne({ _id });
}

// Only the author: the ownerId in the query means someone else's report
// isn't found, so the route returns 404
export async function updateReport(ownerId, id, data) {
  const _id = toObjectId(id);
  if (!_id) {
    return null;
  }
  return reports().findOneAndUpdate(
    { _id, ownerId },
    { $set: { ...data, updatedAt: new Date() } },
    { returnDocument: "after" }
  );
}

export async function deleteReport(ownerId, id) {
  const _id = toObjectId(id);
  if (!_id) {
    return false;
  }
  const result = await reports().deleteOne({ _id, ownerId });
  return result.deletedCount === 1;
}

// Checks that a report points to a fire that's really in the dataset
export async function fireExists(fireId) {
  const count = await getDb()
    .collection("fires")
    .countDocuments({ _id: fireId }, { limit: 1 });
  return count > 0;
}
