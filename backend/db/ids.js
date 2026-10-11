// Helper functions for document IDs: converts URL string IDs to MongoDB ObjectIds
import { ObjectId } from "mongodb";

// function to convert String to ObjectId
// converts to null if String is invalid
export function toObjectId(id) {
  return /^[a-f\d]{24}$/i.test(id) ? new ObjectId(id) : null;
}
