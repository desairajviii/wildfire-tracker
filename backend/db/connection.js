import { MongoClient } from "mongodb";

// database is located in Atlas on Render, local machine when run locally
const uri = process.env.MONGO_URL || "mongodb://localhost:27017";
const client = new MongoClient(uri);
let db;

// function to establish connection
export async function connect() {
  await client.connect();
  db = client.db(process.env.DB_NAME || "wildfire");
  return db;
}

// function to retrieve database without reconnecting
export function getDb() {
  if (!db) throw new Error("Database not connected. Call connect() first.");
  return db;
}

// function to close the connection
export const close = () => client.close();
