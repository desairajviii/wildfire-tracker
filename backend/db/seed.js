// Usage: npm run seed              fetch from NIFC
//        npm run seed -- --cache   reuse a local cache while developing
// Delete data/ after changing FIELDS, YEARS_OF_HISTORY, or any where clause,
// otherwise --cache reuses the old fetch.
import "dotenv/config";
import { readFile, writeFile, mkdir } from "fs/promises";
import { connect, close } from "./connection.js";
import { fetchAllFeatures, LAYERS } from "../services/nifc.js";

// create a string of NIFC fields
const FIELDS = [
  "IrwinID",
  "IncidentName",
  "POOState",
  "IncidentSize",
  "FireDiscoveryDateTime",
  "PercentContained",
].join(",");

// WF only. RX is prescribed burns. CX complexes duplicate corresponding WF fires.
const WILDFIRES = "IncidentTypeCategory = 'WF'";
const YEARS_OF_HISTORY = 5;
const MIN_FIRES = 1000; // min records as required by rubric

const CACHE_DIR = new URL("../../data/", import.meta.url);
const CACHE_FILE = new URL("nifc-cache.json", CACHE_DIR);

// standardize the Irwin IDs to prevent duplicates -remove braces and upper case letters
const normalizeId = (id) => id.replace(/[{}]/g, "").toUpperCase();

// define the five year window start date
function historyStartDate() {
  const d = new Date(); // get current daate
  d.setFullYear(d.getFullYear() - YEARS_OF_HISTORY); // subtract 5 years from the current year
  return d.toISOString().slice(0, 10); // keep only the date
}

// function to load data
// arg useCache: true when npm run seed -- --cache is run, false when --cache is omitted
async function loadSource(useCache) {
  // if useCache is true, try to load data from cache
  if (useCache) {
    try {
      return JSON.parse(await readFile(CACHE_FILE, "utf8"));
    } catch {
      console.log("No cache found, fetching from NIFC.");
    }
  }

  // else fetch data from NFIC
  // fetch the historical data for last 5 years
  const history = await fetchAllFeatures(LAYERS.history, {
    outFields: FIELDS,
    where: `${WILDFIRES} AND FireDiscoveryDateTime >= DATE '${historyStartDate()}'`,
  });
  // Fetch active fires data
  // no date filter to include data with with NULL dates
  const current = await fetchAllFeatures(LAYERS.current, {
    outFields: FIELDS,
    where: WILDFIRES,
  });
  const source = { history, current };

  // cache data if useCache is true
  if (useCache) {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(CACHE_FILE, JSON.stringify(source));
  }
  return source;
}

// function to clean one fire record
// args: feature = NIFC feature, activeIDs = set of active fire IDs
function toFire(feature, activeIds) {
  const p = feature.properties;
  // reject records with no geo point location or IRWIN ID
  if (feature.geometry?.type !== "Point" || !p.IrwinID) return null;

  // normalize the IRWIN ID
  const id = normalizeId(p.IrwinID);

  // clean and return the record
  return {
    _id: id, // use IRWIN ID as unique Mongo ID to control for duplicates
    name: p.IncidentName?.trim() || "Unnamed fire", // remove spaces or if not stated fill as Unnamed Fire
    state: p.POOState?.replace(/^US-/, "") || null, // trim US- in the front or if not stated declare null
    acres: p.IncidentSize ?? null, // if missing, declare null
    // if date is provided, convert to Date
    //else declare null
    discoveredAt: p.FireDiscoveryDateTime
      ? new Date(p.FireDiscoveryDateTime)
      : null,
    percentContained: p.PercentContained ?? null,
    // if the fire ID is in the list of active fire IDs, flag isActive = true
    isActive: activeIds.has(id),
    location: {
      type: "Point",
      coordinates: feature.geometry.coordinates.slice(0, 2), // only retain longitude and latitude
    },
  };
}

// function to convert NIFC features to fire documents and remove duplicate IDs
function buildFires(history, current) {
  // compile IRWINIDs of active fires
  const activeIds = new Set(
    current
      .map((f) => f.properties.IrwinID)
      .filter(Boolean) // remove missing IDs
      .map(normalizeId),
  );

  // // Combine the list of fires
  //Current goes last so its fresher size/containment wins when IDs overlap
  const converted = [...history, ...current]
    .map((f) => toFire(f, activeIds))
    .filter(Boolean); // drop null fires
  const fires = [...new Map(converted.map((f) => [f._id, f])).values()];

  console.log(
    `Fetched ${history.length} history + ${current.length} current; ` +
      `${converted.length} valid, ${fires.length} unique.`,
  );
  return fires;
}

// function to replace data via staging collection
// build and index the new data first, then swap it in
// If anything fails before the rename, the live collection is untouched
async function replaceFires(db, fires) {
  const staging = db.collection("fires_staging");
  await staging.drop().catch(() => {}); // leftover from a failed run, or none
  await staging.insertMany(fires, { ordered: false });
  await staging.createIndexes([
    { key: { location: "2dsphere" } },
    { key: { isActive: 1 } },
    { key: { state: 1 } },
  ]);
  await staging.rename("fires", { dropTarget: true });
}

// Seed metadata for the UI: "as of [seed date]" label and record count
async function writeSeedMeta(db) {
  const col = db.collection("fires");
  const total = await col.countDocuments(); // count all the fires
  const activeCount = await col.countDocuments({ isActive: true }); // count active fires

  await db
    .collection("meta")
    .replaceOne(
      { _id: "seed" },
      { seededAt: new Date(), total, activeCount },
      { upsert: true },
    );
  return { total, activeCount };
}

// main seed function
async function seed() {
  const { history, current } = await loadSource(
    process.argv.includes("--cache"),
  );
  const fires = buildFires(history, current);

  // check that number of surviving fires meets the min requirement, otherwise throw an error
  if (fires.length < MIN_FIRES)
    throw new Error(
      `Only ${fires.length} fires (minimum ${MIN_FIRES}); database left unchanged.`,
    );

  const db = await connect(); // connect to db
  await replaceFires(db, fires);
  const { total, activeCount } = await writeSeedMeta(db);
  console.log(`Done. ${total} fires in database, ${activeCount} active.`);
}

seed()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(close);
