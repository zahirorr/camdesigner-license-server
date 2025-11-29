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

// 🔹 Health-Check für Render & zum Testen im Browser
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/verify-license", (req, res) => {
  const { key, deviceId } = req.body || {};
  if (!key) {
    return res.status(400).json({ valid: false, reason: "NO_KEY" });
  }

  const licenses = loadLicenses();
  const now = new Date();
  const lic = licenses.find((l) => l.key === key.trim());

  if (!lic) return res.json({ valid: false, reason: "NOT_FOUND" });

  if (lic.expiresAt) {
    const exp = new Date(lic.expiresAt);
    if (isNaN(exp.getTime()) || exp < now) {
      return res.json({ valid: false, reason: "EXPIRED" });
    }
  }

  return res.json({
    valid: true,
    reason: null,
    customerName: lic.customerName,
    expiresAt: lic.expiresAt || null,
  });
});

// 🔹 WICHTIG: Render gibt den Port per ENV-Variable vor
const PORT = process.env.PORT || 4000;

// 🔹 WICHTIG: 0.0.0.0, nicht 127.0.0.1
app.listen(PORT, "0.0.0.0", () => {
  console.log("License server running on port", PORT);
});
