// Computed-engine validation harness (Path A1 in docs/improvement-paths.md).
//
// Runs the computed base layer BLIND (frost dates + generic rules only, never
// the curated data) and measures how far its outdoor planting windows diverge
// from hand-reviewed ground truth. Reference-driven: validates against the
// curated Piedmont pack AND every fixture in scripts/validation-fixtures/*.json
// (schema documented there). Drop in a transcribed extension calendar for any
// region and it is measured automatically.
//
// Metrics per reference:
//   PRIMARY TIMING — any computed window overlaps the reference ±1 (right
//                    season). Failure = a real error. The trust headline.
//   FULL FIDELITY  — every window matches ±1. Gaps are mostly succession breadth.
//   MISPLACED      — computed windows with zero overlap. The true bugs.
//
// Informational (exits 0). Run: node scripts/validate-computed.mjs
//   --strict --min=NN   exit 1 if any reference's primary rate < NN (default 90)

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
const minRate = Number((args.find((a) => a.startsWith("--min=")) || "--min=90").split("=")[1]);

const OUTDOOR = new Set(["s", "t", "B"]); // outdoor planting activities

// --- slot helpers ------------------------------------------------------------
const withinTol = (i, other) => [-1, 0, 1].some((d) => other.has((i + d + 24) % 24));
const slotName = (i) => `${SLOTS[i].month} ${SLOTS[i].half === "half1" ? "h1" : "h2"}`;
const SEASON = (i) => (i >= 4 && i <= 13 ? "spring/summer" : "fall/winter");

const MONTH_INDEX = Object.fromEntries(
  ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].map((m, i) => [m, i])
);
function labelToSlot(label) {
  const [mon, half] = label.trim().toLowerCase().split(/\s+/);
  const mi = MONTH_INDEX[mon];
  if (mi === undefined || (half !== "h1" && half !== "h2")) throw new Error(`bad slot label "${label}"`);
  return mi * 2 + (half === "h2" ? 1 : 0);
}
function outdoorSlots(grid) {
  const set = new Set();
  SLOTS.forEach((slot, i) => {
    if ((grid[slot.month][slot.half] || []).some((c) => OUTDOOR.has(c))) set.add(i);
  });
  return set;
}

function siteFrom(lat, lng, lastFrost, firstFrost, id) {
  return {
    lat, lng, zone: "?",
    frostFreeDays: firstFrost["32/50"] - lastFrost["32/50"],
    frost: { lastFrost, firstFrost, station: { id, distanceKm: 0 } },
    datasetVersions: { ncei: "1991-2020" },
  };
}

// --- assemble references ------------------------------------------------------
const carrboro = JSON.parse(
  fs.readFileSync(path.join(rootDir, "app/data/frost-stations.json"), "utf8")
).stations.find((s) => s.id === "USC00311677");
const carrboroSite = siteFrom(carrboro.lat, carrboro.lng, carrboro.lastFrost, carrboro.firstFrost, carrboro.id);

const references = [];

// 1) curated Piedmont pack (verbatim grids)
{
  const pack = loadLegacyPiedmontPack(rootDir);
  const refSlots = new Map();
  for (const row of pack.crops) {
    if (row.timing?.kind === "verbatim") refSlots.set(row.crop, outdoorSlots(row.timing.grid));
  }
  references.push({ name: "curated Piedmont pack (Carrboro)", site: carrboroSite, refSlots });
}

// 2) every fixture file
const fixDir = path.join(rootDir, "scripts/validation-fixtures");
for (const file of fs.readdirSync(fixDir).filter((f) => f.endsWith(".json")).sort()) {
  const fx = JSON.parse(fs.readFileSync(path.join(fixDir, file), "utf8"));
  const site = siteFrom(fx.site.lat, fx.site.lng, fx.site.lastFrost, fx.site.firstFrost, `fixture:${file}`);
  const refSlots = new Map();
  for (const [slug, labels] of Object.entries(fx.crops)) {
    refSlots.set(slug, new Set(labels.map(labelToSlot)));
  }
  references.push({ name: `${fx.region} [${file}]`, site, refSlots, source: fx.source });
}

// --- comparison --------------------------------------------------------------
function compareReference(ref) {
  let compared = 0, primaryOk = 0, fullOk = 0, totalMissed = 0, totalAdded = 0;
  const misplaced = [];
  const gaps = [];

  for (const slug of Object.keys(CROP_CATALOG)) {
    const reference = ref.refSlots.get(slug);
    if (!reference || !reference.size) continue;
    const events = computedEvents(CROP_CATALOG[slug]);
    if (!events) continue;
    const grid = bucketWindows(resolveAnchoredEvents(events, ref.site, CROP_CATALOG[slug]));
    const computed = outdoorSlots(grid);
    if (!computed.size) continue;

    const missed = [...reference].filter((i) => !withinTol(i, computed));
    const added = [...computed].filter((i) => !withinTol(i, reference));
    const overlaps = [...computed].some((i) => withinTol(i, reference));

    compared += 1;
    if (overlaps) primaryOk += 1;
    if (!missed.length && !added.length) fullOk += 1;
    totalMissed += missed.length;
    totalAdded += added.length;

    if (!overlaps) misplaced.push({ slug, computed: [...computed].map(slotName), reference: [...reference].map(slotName) });
    else if (missed.length || added.length) gaps.push({ slug, n: missed.length + added.length });
  }

  return { compared, primaryOk, fullOk, totalMissed, totalAdded, misplaced, gaps };
}

// --- report ------------------------------------------------------------------
let worstPrimary = 100;
for (const ref of references) {
  const r = compareReference(ref);
  const primaryRate = r.compared ? (100 * r.primaryOk) / r.compared : 0;
  const fullRate = r.compared ? (100 * r.fullOk) / r.compared : 0;
  worstPrimary = Math.min(worstPrimary, primaryRate);

  console.log(`\n${"=".repeat(66)}`);
  console.log(`Reference: ${ref.name}`);
  if (ref.source) console.log(`  source: ${ref.source.title}`);
  console.log(`  site frost: last day ${ref.site.frost.lastFrost["32/50"]}, first day ${ref.site.frost.firstFrost["32/50"]} (${ref.site.frostFreeDays} frost-free days)`);
  console.log(`  crops compared: ${r.compared}`);
  console.log(`  PRIMARY TIMING (right season): ${r.primaryOk}/${r.compared} = ${primaryRate.toFixed(0)}%`);
  console.log(`  FULL FIDELITY (all windows ±1): ${r.fullOk}/${r.compared} = ${fullRate.toFixed(0)}%`);
  console.log(`  window-slots missed ${r.totalMissed} / added ${r.totalAdded}`);
  if (r.misplaced.length) {
    console.log(`  ⚠ MISPLACED (wrong season, ${r.misplaced.length}):`);
    for (const c of r.misplaced) console.log(`      ${c.slug}: computed [${c.computed.join(", ")}] vs ref [${c.reference.join(", ")}]`);
  }
}

console.log(`\n${"=".repeat(66)}`);
console.log("Headline PRIMARY TIMING is the trust metric (right season). MISPLACED");
console.log("crops are real bugs. Add regions by dropping a fixture into");
console.log("scripts/validation-fixtures/ — see its README. (No out-of-region");
console.log("fixture yet: extension calendars weren't fetchable in the build env.)");

if (strict && worstPrimary < minRate) {
  console.error(`\nvalidate-computed: worst primary-timing rate ${worstPrimary.toFixed(0)}% < ${minRate}% (--strict)`);
  process.exit(1);
}
