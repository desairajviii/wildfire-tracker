// Fetches wildfire data from NIFC's public ArcGIS API
const BASE =
  "https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services";
const PAGE_SIZE = 2000;

export const LAYERS = {
  history: "WFIGS_Incident_Locations", //all recorded fires
  current: "WFIGS_Incident_Locations_Current", // active fires
};

// functin to fetch
// parameters: layer = dataset (LAYERS.history, LAYERS.current),
// {outfields = columns to return, where = filter}
export async function fetchAllFeatures(
  layer,
  { outFields = "*", where = "1=1" } = {}
) {
  const features = [];
  for (let offset = 0; ;) {
    // request parameter
    const params = new URLSearchParams({
      where,
      outFields,
      outSR: "4326", //coordinate system
      f: "geojson", //response format
      orderByFields: "OBJECTID", //sort by
      resultOffset: offset,
      resultRecordCount: PAGE_SIZE,
    });
    // send request, await NIFC response
    const res = await fetch(`${BASE}/${layer}/FeatureServer/0/query?${params}`);
    // throw error if request failed
    if (!res.ok) throw new Error(`NIFC request failed: ${res.status}`);

    // convert response text into js object
    const page = await res.json();
    // throw error if NIFC responds flagging an error
    if (page.error) throw new Error(`NIFC error: ${page.error.message}`);

    // append fires to features list
    features.push(...page.features);
    // check for NIFC exceededTransferLimit flag indicating more records exist
    const hasMore =
      page.exceededTransferLimit ?? page.properties?.exceededTransferLimit;
    if (!hasMore || page.features.length === 0) return features;
    offset += page.features.length;
  }
}
