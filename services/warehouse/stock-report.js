// A small report that lists product names next to stock counts.

// THE FIX.
// We no longer reach into the catalog's files.
// We ask the Catalog service through the API it published in api/openapi.yaml.
// The address comes from the environment, so it can change without editing code.
const CATALOG_URL = process.env.CATALOG_URL || "http://catalog:8080";

// The stock numbers this service owns.
const stock = { "NL-LAMP-07": 41, "NL-CUSHION-01": 128 };

// Ask the Catalog service for one product. "async" means it may need to wait.
async function fetchItem(sku) {
  // Call the published API. fetch is built into Node 20, so no library is needed.
  const response = await fetch(CATALOG_URL + "/v1/items/" + sku);
  // A 404 is a valid answer. It means the catalog does not know this sku.
  if (response.status === 404) {
    return null;
  }
  // Anything else that is not a success is a real problem.
  if (!response.ok) {
    throw new Error("catalog_unavailable");
  }
  // Turn the JSON answer into an object and give it back.
  return await response.json();
}

// Build one line of the report for each product we hold.
async function buildReport() {
  // Start with an empty list of report lines.
  const lines = [];
  // Look at each sku we hold stock for.
  for (const sku of Object.keys(stock)) {
    // Ask the catalog, over HTTP, for the product details.
    const item = await fetchItem(sku);
    // Add one line to the report.
    lines.push({ sku: sku, name: item ? item.name : "unknown", on_hand: stock[sku] });
  }
  // Give the report back.
  return lines;
}

// Make it available to other files in this service.
module.exports = { buildReport: buildReport };
