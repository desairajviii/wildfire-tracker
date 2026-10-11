import { getDb } from "./connection.js";
import { toObjectId } from "./ids.js";

const watchlists = () => getDb().collection("watchlists");

export async function createWatchlist(ownerId, data) {
  const doc = { ownerId, ...data, createdAt: new Date() };
  const result = await watchlists().insertOne(doc);
  return { _id: result.insertedId, ...doc };
}

export async function listWatchlists(ownerId) {
  return watchlists().find({ ownerId }).sort({ createdAt: -1 }).toArray();
}

export async function getWatchlist(ownerId, id) {
  const _id = toObjectId(id);
  if (!_id) {
    return null;
  }
  return watchlists().findOne({ _id, ownerId });
}

export async function updateWatchlist(ownerId, id, data) {
  const _id = toObjectId(id);
  if (!_id) {
    return null;
  }
  return watchlists().findOneAndUpdate(
    { _id, ownerId },
    { $set: data },
    { returnDocument: "after" }
  );
}

export async function deleteWatchlist(ownerId, id) {
  const _id = toObjectId(id);
  if (!_id) {
    return false;
  }
  const result = await watchlists().deleteOne({ _id, ownerId });
  return result.deletedCount === 1;
}
