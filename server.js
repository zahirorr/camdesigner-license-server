const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const LICENSES_FILE = path.join(__dirname, "licenses.json");

function loadLicenses() {
  try {
    const raw = fs.readFileSync(LICENSES_FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("Could not read licenses.json:", e.message);
    return [];
  }
}

function saveLicenses(licenses) {
  fs.writeFileSync(LICENSES_FILE, JSON.stringify(licenses, null, 2), "utf8");
}

// 🔹 Health-Check für Render & zum Testen im Browser
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/verify-license", (req, res) => {
  const { key, deviceId } = req.body || {};

  if (!key) {
    return res.status(400).json({ valid: false, reason: "NO_KEY" });
  }
  if (!deviceId) {
    // Unser Client sendet immer deviceId – wenn nicht, blocken
    return res.status(400).json({ valid: false, reason: "NO_DEVICE_ID" });
  }

  const licenses = loadLicenses();
  const now = new Date();
  const lic = licenses.find((l) => l.key === key.trim());

  if (!lic) {
    return res.json({ valid: false, reason: "NOT_FOUND" });
  }

  // Ablaufdatum prüfen
  if (lic.expiresAt) {
    const exp = new Date(lic.expiresAt);
    if (isNaN(exp.getTime()) || exp < now) {
      return res.json({ valid: false, reason: "EXPIRED" });
    }
  }

  // maxDevices & devices-Feld vorbereiten
  const maxDevices = typeof lic.maxDevices === "number" && lic.maxDevices > 0
    ? lic.maxDevices
    : 1; // Fallback: 1 PC, wenn nichts gesetzt

  if (!Array.isArray(lic.devices)) {
    lic.devices = [];
  }

  // Doppelte / leere Einträge filtern
  lic.devices = lic.devices.filter((d) => typeof d === "string" && d.trim().length > 0);

  const alreadyRegistered = lic.devices.includes(deviceId);
  const usedDevices = lic.devices.length;

  if (!alreadyRegistered) {
    if (usedDevices >= maxDevices) {
      // Zu viele Geräte → blocken
      return res.json({
        valid: false,
        reason: "MAX_DEVICES_REACHED",
        maxDevices,
        usedDevices,
      });
    }

    // Neues Gerät registrieren
    lic.devices.push(deviceId);
    saveLicenses(licenses);
    console.log(
      `📌 License ${lic.key}: new device registered (${deviceId}). ` +
      `Used ${lic.devices.length}/${maxDevices}`
    );
  }

  // Alles ok
  return res.json({
    valid: true,
    reason: null,
    customerName: lic.customerName,
    expiresAt: lic.expiresAt || null,
    maxDevices,
    usedDevices: lic.devices.length,
  });
});

// 🔹 WICHTIG: Render gibt den Port per ENV-Variable vor
const PORT = process.env.PORT || 4000;

// 🔹 WICHTIG: 0.0.0.0, nicht 127.0.0.1
app.listen(PORT, "0.0.0.0", () => {
  console.log("License server running on port", PORT);
});
