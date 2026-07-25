// Computed-engine validation harness (Path A1 in docs/improvement-paths.md).
//
// The computed base layer serves a planting calendar for most of the country
// from generic hardiness + days-to-maturity rules that were never checked
// against ground truth. This measures how far those generic rules diverge from
// hand-reviewed truth, so "estimate-grade, we hope" becomes "estimate-grade,
// measured — and here are the systematic biases."
//
// v1 validates at the one place we have solid ground truth: the Piedmont. The
// computed engine is run BLIND (it sees only frost dates + generic rules, never
// the curated data) and its outdoor planting windows are compared against the
// curated Piedmont pack. Divergence here reveals biases in the generic rules
// that apply everywhere. Add more regions via scripts/validation-fixtures/
// (schema documented there) as their extension calendars are transcribed.
//
// Informational (exits 0). Run: node scripts/validate-computed.mjs
//   --strict   exit 1 if within-tolerance rate falls below --min (default 60)
//   --min=NN   set that threshold

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { computedEvents } from "../app/lib/engine/computed-rules.js";
import { resolveAnchoredEvents, bucketWindows, SLOTS } from "../app/lib/engine/resolve.js";
import { CROP_CATALOG } from "../app/lib/crop-catalog.js";
import { loadLegacyPiedmontPack } from "../schema/loader/load-legacy.mjs";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const args = process.argv.slice(2);
const strict = args.includes("--strict");
const minRate = Number((args.find((a) => a.startsWith("--min=")) || "--min=60").split("=")[1]);

const OUTDOOR = new Set(["s", "t", "B"]); // outdoor planting activities

// --- geographic reference site: Carrboro, from the real NCEI seed -----------
const frostSeed = JSON.parse(
  fs.readFileSync(path.join(rootDir, "app/data/frost-stations.json"), "utf8")
);
const carrboro = frostSeed.stations.find((s) => s.id === "USC00311677");
const site = {
  lat: carrboro.lat,
  lng: carrboro.lng,
  zone: "8a",
  frostFreeDays: carrboro.firstFrost["32/50"] - carrboro.lastFrost["32/50"],
  frost: {
    lastFrost: carrboro.lastFrost,
    firstFrost: carrboro.firstFrost,
    station: { id: carrboro.id, distanceKm: 0 },
  },
  datasetVersions: { ncei: "1991-2020" },
};

// --- reference = curated Piedmont pack (verbatim grids) ---------------------
const pack = loadLegacyPiedmontPack(rootDir);
const refGrids = new Map();
for (const row of pack.crops) {
  if (row.timing?.kind === "verbatim") refGrids.set(row.crop, row.timing.grid);
}

// --- helpers ----------------------------------------------------------------
function outdoorSlots(grid) {
  const set = new Set();
  SLOTS.forEach((slot, i) => {
    if ((grid[slot.month][slot.half] || []).some((c) => OUTDOOR.has(c))) set.add(i);
  });
  return set;
}
const withinTol = (i, other) => [-1, 0, 1].some((d) => other.has((i + d + 24) % 24));
const slotName = (i) => `${SLOTS[i].month} ${SLOTS[i].half === "half1" ? "h1" : "h2"}`;
const SEASON = (i) => (i >= 4 && i <= 13 ? "spring/summer" : "fall/winter"); // ~Mar–Jul vs Aug–Feb

// --- compare ----------------------------------------------------------------
// Two distinct quality questions, because they matter very differently:
//   PRIMARY TIMING  — does computed plant in roughly the right season at all?
//                     (any computed window overlaps a reference window ±1)
//                     A failure here = a real, serious error (wrong season).
//   FULL FIDELITY   — does computed reproduce EVERY reference window ±1?
//                     Failures here are mostly the curated pack's succession
//                     runs the conservative single-window rule omits — a
//                     coverage gap, not a wrong date.
let compared = 0;
let primaryOk = 0; // computed overlaps reference somewhere
let fullOk = 0; // every window within tolerance both ways
let totalMissed = 0;
let totalAdded = 0;
const missedBySeason = { "spring/summer": 0, "fall/winter": 0 };
const addedBySeason = { "spring/summer": 0, "fall/winter": 0 };
const misplaced = []; // computed windows with ZERO reference overlap — true errors
const gaps = []; // right season, but narrower/broader than reference
const skippedNoComputed = [];
const skippedNoReference = [];

for (const slug of Object.keys(CROP_CATALOG)) {
  const ref = refGrids.get(slug);
  if (!ref) { skippedNoReference.push(slug); continue; }

  const events = computedEvents(CROP_CATALOG[slug]);
  if (!events) { skippedNoComputed.push(slug); continue; } // perennial / no usable DTH

  const grid = bucketWindows(resolveAnchoredEvents(events, site, CROP_CATALOG[slug]));
  const computed = outdoorSlots(grid);
  const reference = outdoorSlots(ref);
  if (!computed.size || !reference.size) { skippedNoComputed.push(slug); continue; }

  const missed = [...reference].filter((i) => !withinTol(i, computed));
  const added = [...computed].filter((i) => !withinTol(i, reference));
  const overlaps = [...computed].some((i) => withinTol(i, reference));

  compared += 1;
  if (overlaps) primaryOk += 1;
  if (!missed.length && !added.length) fullOk += 1;
  totalMissed += missed.length;
  totalAdded += added.length;
  for (const i of missed) missedBySeason[SEASON(i)] += 1;
  for (const i of added) addedBySeason[SEASON(i)] += 1;

  if (!overlaps) {
    misplaced.push({ slug, computed: [...computed].map(slotName), reference: [...reference].map(slotName) });
  } else if (missed.length || added.length) {
    gaps.push({ slug, missed: missed.map(slotName), added: added.map(slotName) });
  }
}

// --- report -----------------------------------------------------------------
const primaryRate = compared ? (100 * primaryOk) / compared : 0;
const fullRate = compared ? (100 * fullOk) / compared : 0;
console.log("Computed-engine validation vs curated Piedmont pack (Carrboro)");
console.log("=".repeat(62));
console.log(`Site: ${site.frost.station.id}  last 32/50 = day ${site.frost.lastFrost["32/50"]}, first = day ${site.frost.firstFrost["32/50"]} (${site.frostFreeDays} frost-free days)`);
console.log(`Crops compared: ${compared}  (skipped: ${skippedNoComputed.length} no computed window, ${skippedNoReference.length} no reference)`);
console.log("");
console.log(`PRIMARY TIMING right season:  ${primaryOk}/${compared} = ${primaryRate.toFixed(0)}%   (the honest headline)`);
console.log(`FULL FIDELITY all windows ±1: ${fullOk}/${compared} = ${fullRate.toFixed(0)}%   (gap = succession runs omitted)`);
console.log(`Window-slots MISSED (mostly succession breadth): ${totalMissed}  (spring/summer ${missedBySeason["spring/summer"]}, fall/winter ${missedBySeason["fall/winter"]})`);
console.log(`Window-slots ADDED (over-eager):                 ${totalAdded}  (spring/summer ${addedBySeason["spring/summer"]}, fall/winter ${addedBySeason["fall/winter"]})`);

if (misplaced.length) {
  console.log(`\n⚠ MISPLACED — computed plants the wrong season entirely (${misplaced.length}, true bugs):`);
  for (const c of misplaced) {
    console.log(`  ${c.slug}: computed [${c.computed.join(", ")}]  vs reference [${c.reference.join(", ")}]`);
  }
}

if (gaps.length) {
  console.log(`\nCoverage gaps — right season, narrower/broader than curated (${gaps.length}):`);
  gaps.sort((a, b) => (b.missed.length + b.added.length) - (a.missed.length + a.added.length));
  for (const c of gaps.slice(0, 12)) {
    const parts = [];
    if (c.missed.length) parts.push(`misses [${c.missed.join(", ")}]`);
    if (c.added.length) parts.push(`adds [${c.added.join(", ")}]`);
    console.log(`  ${c.slug}: ${parts.join("; ")}`);
  }
  if (gaps.length > 12) console.log(`  … and ${gaps.length - 12} more`);
}

console.log(
  "\nReading: PRIMARY TIMING is the trust metric — how often the computed layer" +
  "\nputs a crop in the right season. MISPLACED crops are real rule bugs (e.g." +
  "\noverwintered crops the generic rule spring-plants). The MISSED total is" +
  "\nmostly the curated pack's succession runs the single-window rule omits —" +
  "\ncoverage, not wrong dates. Validate more regions via scripts/validation-fixtures/."
);

if (strict && primaryRate < minRate) {
  console.error(`\nvalidate-computed: primary-timing rate ${primaryRate.toFixed(0)}% < ${minRate}% (--strict)`);
  process.exit(1);
}
