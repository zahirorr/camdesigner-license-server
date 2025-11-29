// license-server/generate-license.js
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const LICENSES_FILE = path.join(__dirname, "licenses.json");

function loadLicenses() {
  try {
    const raw = fs.readFileSync(LICENSES_FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveLicenses(list) {
  fs.writeFileSync(LICENSES_FILE, JSON.stringify(list, null, 2));
}

function generateKey() {
  function block() {
    return crypto.randomBytes(2).toString("hex").toUpperCase();
  }
  return `SD-${block()}-${block()}-${block()}`;
}

function addLicense(customerName, daysValid) {
  const licenses = loadLicenses();
  const key = generateKey();
  const now = new Date();
  const exp = new Date(now.getTime() + daysValid * 24 * 60 * 60 * 1000);

  licenses.push({
    key,
    customerName,
    expiresAt: exp.toISOString()
  });

  saveLicenses(licenses);
  console.log("New license created:");
  console.log("Customer:", customerName);
  console.log("Key:     ", key);
  console.log("Valid to:", exp.toISOString());
}

const name = process.argv[2];
const days = parseInt(process.argv[3] || "365", 10);

if (!name) {
  console.log("Usage: node generate-license.js \"Customer Name\" [daysValid]");
  process.exit(1);
}

addLicense(name, days);
