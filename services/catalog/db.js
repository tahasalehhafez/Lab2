// This module stands in for the Catalog database connection.
// ADR-001 says only the Catalog service may use it.

// The product rows. In a real system these come from a database.
const rows = {
  "NL-LAMP-07": { sku: "NL-LAMP-07", name: "Riyadh Reading Lamp", price_sar: 180.0, in_stock: 42 },
  "NL-CUSHION-01": { sku: "NL-CUSHION-01", name: "Najd Cotton Cushion", price_sar: 120.0, in_stock: 130 },
  "NL-RUG-22": { sku: "NL-RUG-22", name: "Asir Wool Rug", price_sar: 940.0, in_stock: 7 }
};

// Find one product row by its sku.
function findBySku(sku) {
  // Give back the row, or nothing at all if we do not have it.
  return rows[sku] || null;
}

// Make the function available to other files inside this service.
module.exports = { findBySku: findBySku };
