// Suitability-engine validation harness (Step 4, docs/climate-suitability-model.md).
//
// Runs the NEW climate-suitability engine BLIND (crop climate requirements +
// the site's frost-derived temperature model, never the curated data) and
// measures its outdoor planting windows against the same hand-reviewed
// references the offset engine is graded on — and prints both side by side, so
// "does the general engine match or beat the frost-offset rules?" is answered
// with one command.
//
// The suitability model needs the full multi-threshold frost climatology to fit
// its temperature curve; test fixtures carry only 32/50, so for each reference
// the climate model is built from the NEAREST real seed station (app/data/
// frost-stations.json), while the comparison is still against that reference's
// own reviewed slots. Station + fit quality are printed for honesty.
//
// Metrics per reference (identical to validate-computed.mjs):
//   PRIMARY TIMING — any computed window overlaps the reference ±1 (right season)
//   FULL FIDELITY  — every window matches ±1
//   MISPLACED      — computed windows with zero overlap (the real bugs)
//
// Informational (exits 0). Run: node scripts/validate-suitability.mjs
//   --strict --min=NN   exit 1 if any reference's suitability primary rate < NN

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { computedEvents } from "../app/lib/engine/computed-rules.js";
import { resolveAnchoredEvents, bucketWindows, SLOTS } from "../app/lib/engine/resolve.js";
import { realSiteClimate } from "../app/lib/engine/climate-model.js";
import { suitabilityFor } from "../app/lib/engine/suitability.js";
import { CROP_CATALOG } from "../app/lib/crop-catalog.js";
import { loadLegacyPiedmontPack } from "../schema/loader/load-legacy.mjs";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const args = process.argv.slice(2);
const strict = args.includes("--strict");
const minRate = Number((args.find((a) => a.startsWith("--min=")) || "--min=90").split("=")[1]);

const OUTDOOR = new Set(["s", "t", "B"]);
const withinTol = (i, other) => [-1, 0, 1].some((d) => other.has((i + d + 24) % 24));
const slotName = (i) => `${SLOTS[i].month} ${SLOTS[i].half === "half1" ? "h1" : "h2"}`;

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

// --- real stations (full multi-threshold frost tables) -----------------------
const stations = JSON.parse(
  fs.readFileSync(path.join(rootDir, "app/data/frost-stations.json"), "utf8")
).stations;
function haversine(aLat, aLng, bLat, bLng) {
  const R = 6371, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat), dLng = toRad(bLng - aLng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
// Real NCEI daily temperature normals, compacted to 24 half-month slots.
const tempNormals = JSON.parse(
  fs.readFileSync(path.join(rootDir, "app/data/temp-normals.json"), "utf8")
).stations;
function nearestTempStation(lat, lng) {
  let best = null;
  for (const s of tempNormals) {
    const km = haversine(lat, lng, s.lat, s.lng);
    if (!best || km < best.km) best = { station: s, km };
  }
  return best;
}
/** Build a real (heat-modeled) SiteClimate for a reference from its nearest station. */
function climateForRef(lat, lng) {
  const { station, km } = nearestTempStation(lat, lng);
  return { climate: realSiteClimate(station), station, km };
}

// --- assemble references (same set as validate-computed.mjs) -----------------
const carrboro = stations.find((s) => s.id === "USC00311677");
const carrboroSite = siteFrom(carrboro.lat, carrboro.lng, carrboro.lastFrost, carrboro.firstFrost, carrboro.id);

const references = [];
{
  const pack = loadLegacyPiedmontPack(rootDir);
  const refSlots = new Map();
  for (const row of pack.crops) {
    if (row.timing?.kind === "verbatim") refSlots.set(row.crop, outdoorSlots(row.timing.grid));
  }
  references.push({ name: "curated Piedmont pack (Carrboro)", site: carrboroSite, refSlots });
}
const fixDir = path.join(rootDir, "scripts/validation-fixtures");
for (const file of fs.readdirSync(fixDir).filter((f) => f.endsWith(".json")).sort()) {
  const fx = JSON.parse(fs.readFileSync(path.join(fixDir, file), "utf8"));
  const site = siteFrom(fx.site.lat, fx.site.lng, fx.site.lastFrost, fx.site.firstFrost, `fixture:${file}`);
  const refSlots = new Map();
  for (const [slug, labels] of Object.entries(fx.crops)) refSlots.set(slug, new Set(labels.map(labelToSlot)));
  references.push({ name: `${fx.region} [${file}]`, site, refSlots, source: fx.source });
}

// --- comparison --------------------------------------------------------------
function offsetSlots(slug, site) {
  const events = computedEvents(CROP_CATALOG[slug]);
  if (!events) return null;
  const grid = bucketWindows(resolveAnchoredEvents(events, site, CROP_CATALOG[slug]));
  const s = outdoorSlots(grid);
  return s.size ? s : null;
}
function suitabilitySlots(slug, climate) {
  const res = suitabilityFor(CROP_CATALOG[slug], climate);
  if (!res || !res.windows.length) return null;
  const s = outdoorSlots(bucketWindows(res.windows));
  return s.size ? s : null;
}
function score(getComputed, ref) {
  let compared = 0, primaryOk = 0, fullOk = 0;
  const misplaced = [];
  for (const slug of Object.keys(CROP_CATALOG)) {
    const reference = ref.refSlots.get(slug);
    if (!reference || !reference.size) continue;
    const computed = getComputed(slug);
    if (!computed) continue;
    const missed = [...reference].filter((i) => !withinTol(i, computed));
    const added = [...computed].filter((i) => !withinTol(i, reference));
    const overlaps = [...computed].some((i) => withinTol(i, reference));
    compared += 1;
    if (overlaps) primaryOk += 1;
    if (!missed.length && !added.length) fullOk += 1;
    if (!overlaps) misplaced.push({ slug, computed: [...computed].map(slotName), reference: [...reference].map(slotName) });
  }
  return { compared, primaryOk, fullOk, misplaced };
}

// --- report ------------------------------------------------------------------
let worstPrimary = 100;
for (const ref of references) {
  const { climate, station, km } = climateForRef(ref.site.lat, ref.site.lng);
  const off = score((slug) => offsetSlots(slug, ref.site), ref);
  const suit = score((slug) => suitabilitySlots(slug, climate), ref);
  const rate = (r) => (r.compared ? (100 * r.primaryOk) / r.compared : 0);
  worstPrimary = Math.min(worstPrimary, rate(suit));

  console.log(`\n${"=".repeat(70)}`);
  console.log(`Reference: ${ref.name}`);
  if (ref.source) console.log(`  source: ${ref.source.title}`);
  console.log(`  climate model: station ${station.id} (${station.name.trim()}), ${km.toFixed(0)} km away`);
  console.log(`    source: ${climate.source}, heatModeled=${climate.heatModeled}, peak max ${Math.max(...climate.tmaxF).toFixed(0)}°F, frost-free crossings last=${climate.lastFrostDay}/first=${climate.firstFrostDay}`);
  console.log(`  crops compared: offset ${off.compared}, suitability ${suit.compared}`);
  console.log(`  PRIMARY TIMING (right season):`);
  console.log(`    offset engine     : ${off.primaryOk}/${off.compared} = ${rate(off).toFixed(0)}%`);
  console.log(`    suitability engine: ${suit.primaryOk}/${suit.compared} = ${rate(suit).toFixed(0)}%`);
  console.log(`  FULL FIDELITY (all ±1):`);
  console.log(`    offset engine     : ${off.fullOk}/${off.compared} = ${(off.compared ? (100 * off.fullOk) / off.compared : 0).toFixed(0)}%`);
  console.log(`    suitability engine: ${suit.fullOk}/${suit.compared} = ${(suit.compared ? (100 * suit.fullOk) / suit.compared : 0).toFixed(0)}%`);
  if (suit.misplaced.length) {
    console.log(`  ⚠ suitability MISPLACED (wrong season, ${suit.misplaced.length}):`);
    for (const c of suit.misplaced) console.log(`      ${c.slug}: computed [${c.computed.join(", ")}] vs ref [${c.reference.join(", ")}]`);
  }
}

// --- desert demonstration: the offset engine REFUSED this; suitability doesn't -
const desert = tempNormals.find((s) => s.id === "USW00023183"); // Phoenix
if (desert) {
  const climate = realSiteClimate(desert);
  console.log(`\n${"=".repeat(70)}`);
  console.log(`DESERT (heat wall): ${desert.name.trim()} — peak max ${Math.max(...climate.tmaxF).toFixed(0)}°F, frost-free (last=${climate.lastFrostDay}, first=${climate.firstFrostDay})`);
  console.log("  The frost-offset engine REFUSES this site (no frost anchors). The");
  console.log("  suitability engine, with the real heat wall, produces a calendar:");
  for (const slug of ["lettuce-leaf", "tomatoes", "beans-snap-bush", "spinach"]) {
    const res = suitabilityFor(CROP_CATALOG[slug], climate);
    const slots = res && res.windows.length ? [...outdoorSlots(bucketWindows(res.windows))].map(slotName) : ["(none)"];
    console.log(`    ${slug.padEnd(16)} ${slots.join(", ")}`);
  }
  console.log("  Expect: cool crops (lettuce, spinach) in the cool season around winter;");
  console.log("  warm crops (tomatoes, beans) in spring + fall shoulders, avoiding peak");
  console.log("  summer heat — the low-desert two-season pattern (U of A az1005).");
}

console.log(`\n${"=".repeat(70)}`);
console.log("The suitability engine and the offset engine are graded on the SAME");
console.log("references. Now backed by REAL NCEI daily temperature normals (heat wall");
console.log("modeled), so frost-free deserts get a calendar instead of a refusal.");
console.log("A committed desert FIXTURE (U of A az1005) is the remaining validation gap.");

if (strict && worstPrimary < minRate) {
  console.error(`\nvalidate-suitability: worst primary-timing rate ${worstPrimary.toFixed(0)}% < ${minRate}% (--strict)`);
  process.exit(1);
}
