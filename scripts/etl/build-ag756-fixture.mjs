// Builds a validation fixture from the NC State AG-756 planting calendar already
// in the repo (scripts/ncsu-planting-dates.json), so the computed engine can be
// validated against a REAL, independent reference — distinct from the curated
// pack, which deliberately diverges from AG-756. This is not a second geographic
// region (it's Central NC / the Piedmont), but it is a genuine second reference.
//
// Honesty: this only reshapes data already transcribed and cited in-repo; it
// invents nothing. Run: node scripts/etl/build-ag756-fixture.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { NCSU_NAME_MAP } from "../lib/ncsu-name-map.mjs";
import { slugify } from "../../schema/loader/load-legacy.mjs";

const rootDir = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

const ncsu = JSON.parse(fs.readFileSync(path.join(rootDir, "scripts/ncsu-planting-dates.json"), "utf8"));
const carrboro = JSON.parse(
  fs.readFileSync(path.join(rootDir, "app/data/frost-stations.json"), "utf8")
).stations.find((s) => s.id === "USC00311677");

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MON_ABBR = { Jan: "jan", Feb: "feb", Mar: "mar", Apr: "apr", May: "may", Jun: "jun", Jul: "jul", Aug: "aug", Sep: "sep", Oct: "oct", Nov: "nov", Dec: "dec" };
// AG-756 codes we treat as OUTDOOR planting: S(seed) T(transplant) B(bulb)
// Tu(tuber) C(crown). Everything is outdoor in this source.
const OUTDOOR_CODES = new Set(["S", "T", "B", "Tu", "C"]);

// "Apr_h2" -> "apr h2"
function labelOf(key) {
  const [mon, half] = key.split("_");
  return `${MON_ABBR[mon]} ${half}`;
}

const crops = {};
for (const [appName, ncsuName] of Object.entries(NCSU_NAME_MAP)) {
  const row = ncsu.crops[ncsuName];
  if (!row) continue;
  const labels = Object.entries(row)
    .filter(([, code]) => OUTDOOR_CODES.has(code))
    .map(([key]) => labelOf(key));
  if (labels.length) crops[slugify(appName)] = labels;
}

const fixture = {
  region: "North Carolina Piedmont / Central NC",
  source: {
    title: "NC State Extension — Central North Carolina Planting Calendar (AG-756)",
    url: "https://content.ces.ncsu.edu/central-north-carolina-planting-calendar-for-annual-vegetables-fruits-and-herbs",
    transcribedBy: "in-repo scripts/ncsu-planting-dates.json (pre-existing)",
    note: "Same region as the curated pack but an INDEPENDENT reference — the curated pack deliberately diverges from AG-756. Outdoor planting windows (S/T/B/Tu/C) only. Not a second geographic region.",
  },
  site: {
    lat: carrboro.lat,
    lng: carrboro.lng,
    lastFrost: { "32/50": carrboro.lastFrost["32/50"] },
    firstFrost: { "32/50": carrboro.firstFrost["32/50"] },
  },
  crops,
};

const outPath = path.join(rootDir, "scripts/validation-fixtures/nc-central-ag756.json");
fs.writeFileSync(outPath, JSON.stringify(fixture, null, 2) + "\n");
console.log(`build-ag756-fixture: ${Object.keys(crops).length} crops -> ${path.relative(rootDir, outPath)}`);
