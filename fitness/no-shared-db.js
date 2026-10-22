// An architecture test. It does not check what the code does.
// It checks whether the code still obeys ADR-001:
// only the Catalog service may touch the Catalog data.

// "fs" is the built-in tool for reading files and folders.
const fs = require("fs");
// "path" is the built-in tool for joining folder names safely on any system.
const path = require("path");

// The folder that holds one sub-folder per service.
const SERVICES_DIR = "services";

// Collect every .js file inside a folder, including sub-folders.
function listJsFiles(dir) {
  // Start with an empty list.
  let found = [];
  // Read what is inside this folder.
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  // Look at each thing we found.
  for (const entry of entries) {
    // Build the full path to it.
    const full = path.join(dir, entry.name);
    // If it is a folder, look inside it too.
    if (entry.isDirectory()) {
      // Skip downloaded libraries. They are not our code.
      if (entry.name === "node_modules") {
        continue;
      }
      // Add everything we find deeper down.
      found = found.concat(listJsFiles(full));
    } else if (entry.name.endsWith(".js")) {
      // It is one of our JavaScript files, so keep it.
      found.push(full);
    }
  }
  // Hand the list back.
  return found;
}

// Turn a Windows path with backslashes into one with forward slashes,
// so the same test works on Windows, macOS and Linux.
function normalise(p) {
  return path.normalize(p).split(path.sep).join("/");
}

// Read the list of services from the folder names.
const serviceNames = fs
  .readdirSync(SERVICES_DIR, { withFileTypes: true })
  .filter(function (e) { return e.isDirectory(); })
  .map(function (e) { return e.name; });

// Every broken rule we find goes in here.
const violations = [];

// Check one service at a time.
for (const service of serviceNames) {
  // Find every JavaScript file that belongs to this service.
  const files = listJsFiles(path.join(SERVICES_DIR, service));

  // Read each file line by line.
  for (const file of files) {
    // Load the whole file as text.
    const text = fs.readFileSync(file, "utf8");
    // Split it into separate lines so we can report a line number.
    const lines = text.split("\n");

    // Look at each line.
    for (let i = 0; i < lines.length; i++) {
      // The current line.
      const line = lines[i];

      // Find a require with a path in quotes, for example require("../catalog/db").
      const match = line.match(/require\(\s*['"]([^'"]+)['"]\s*\)/);
      // No require on this line, so move on.
      if (!match) {
        continue;
      }

      // The text inside the quotes.
      const target = match[1];

      // If it does not start with a dot, it is a downloaded library. That is allowed.
      if (target.charAt(0) !== ".") {
        continue;
      }

      // Work out where that relative path actually points.
      const resolved = normalise(path.join(path.dirname(file), target));

      // Compare it against every other service.
      for (const other of serviceNames) {
        // Reaching into your own folder is fine.
        if (other === service) {
          continue;
        }
        // Does the path point inside another service's folder?
        if (resolved.indexOf(SERVICES_DIR + "/" + other + "/") === 0) {
          // Record the broken rule, with everything a person needs to fix it.
          violations.push({
            rule: "ADR-001: a service must not import another service's internals",
            file: normalise(file),
            line: i + 1,
            imports: target,
            offending_service: service,
            owner_service: other,
            fix: "Call the " + other + " HTTP API instead of importing its files"
          });
        }
      }
    }
  }
}

// ---- The report ----

// A blank line, then a title, so the output is easy to read.
console.log("");
console.log("Architecture fitness test: no shared database access");
console.log("Rule source: docs/adr/adr-001-catalog-owns-data.md");
console.log("Services checked: " + serviceNames.join(", "));
console.log("");

// If we found nothing, say so and finish successfully.
if (violations.length === 0) {
  console.log("PASS - no service imports another service's internals.");
  console.log("");
  // Exit code 0 means success. A build pipeline reads this number.
  process.exit(0);
}

// Otherwise, print every problem we found.
console.log("FAIL - " + violations.length + " violation(s) found.");
console.log("");
// Print each one on its own block.
for (const v of violations) {
  console.log("  " + v.file + ":" + v.line);
  console.log("    imports        : " + v.imports);
  console.log("    offender       : " + v.offending_service);
  console.log("    owner          : " + v.owner_service);
  console.log("    rule           : " + v.rule);
  console.log("    how to fix     : " + v.fix);
  console.log("");
}
// Exit code 1 means failure. This is what stops a build pipeline.
process.exit(1);
