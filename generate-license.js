const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const LICENSES_FILE = path.join(__dirname, "licenses.json");

function loadLicenses() {
  try {
    const raw = fs.readFileSync(LICENSES_FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    // Wenn Datei noch nicht existiert → leeres Array
    return [];
  }
}

function saveLicenses(licenses) {
  fs.writeFileSync(LICENSES_FILE, JSON.stringify(licenses, null, 2), "utf8");
}

// Schöner Lizenz-Key, z.B. ABCD-1234-EFGH-5678
function generateKey() {
  const raw = crypto.randomBytes(16).toString("hex").toUpperCase();
  // 32 Hex-Zeichen → 4 Blöcke à 4
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
}

// CLI-Parameter: Kunde, Tage, maxDevices
const [, , customerNameArg, daysArg, maxDevicesArg] = process.argv;

if (!customerNameArg || !daysArg) {
  console.error("Use: node generate-license.js \"Customer Name\" <daysValid> [maxDevices]");
  process.exit(1);
}

const customerName = customerNameArg.trim();
const daysValid = parseInt(daysArg, 10);

if (isNaN(daysValid) || daysValid <= 0) {
  console.error("daysValid must be a positive integer.");
  process.exit(1);
}

// Standard: 3 Geräte, wenn nichts angegeben
let maxDevices = 3;
if (maxDevicesArg !== undefined) {
  const parsed = parseInt(maxDevicesArg, 10);
  if (!isNaN(parsed) && parsed > 0) {
    maxDevices = parsed;
  } else {
    console.warn("⚠️ maxDevices invalid, fallback to 3.");
  }
}

const licenses = loadLicenses();

const key = generateKey();
const now = new Date();
const expiresAt = new Date(now.getTime() + daysValid * 24 * 60 * 60 * 1000);

const newLicense = {
  key,
  customerName,
  expiresAt: expiresAt.toISOString(),
  maxDevices,
  devices: []
};

licenses.push(newLicense);
saveLicenses(licenses);

console.log("✅ New license created:");
console.log("  Customer   :", customerName);
console.log("  Key        :", key);
console.log("  Days valid :", daysValid);
console.log("  Expires at :", newLicense.expiresAt);
console.log("  Max devices:", maxDevices);
console.log("");
console.log("➡️  Use this key in your app:", key);
