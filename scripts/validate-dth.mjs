// Days-to-maturity cross-check (catalog data quality).
//
// The crop catalog's `daysToMaturity` is provisional — parsed from the Carrboro
// legacy free-text and never validated against an independent source. DTH drives
// the computed engine (succession-window length, the applicability filter, and
// derived harvest timing), so it's worth checking. This compares each catalog
// entry against an independent extension source: NMSU Circular 457-B, "Growing
// Zones and Planting Information for Home Vegetable Gardens in New Mexico"
// (Table 2, days-to-harvest), Walker & Joukhadar, rev. Jan 2026 — reproduced
// with citation per NMSU's educational-use terms.
//
// Informational (exits 0). Run: node scripts/validate-dth.mjs
//   --strict   exit 1 if any crop diverges > tolerance
//   --tol=NN   divergence tolerance in days (default 15)

import process from "node:process";
import { CROP_CATALOG } from "../app/lib/crop-catalog.js";

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const tol = Number((args.find((a) => a.startsWith("--tol=")) || "--tol=15").split("=")[1]);

// NMSU CR457-B Table 2 "days to harvest" → our catalog slug. Single number each.
const NMSU_DTH = {
  "beans-snap-bush": 54, "beans-snap-pole": 63, "lima-bean-bush": 68, "lima-bean-pole": 88,
  beets: 56, broccoli: 60, "brussels-sprouts": 93, cabbage: 67, "cabbage-chinese": 57,
  cantaloupe: 86, carrots: 72, cauliflower: 75, "chard-swiss": 58, "collard-greens": 80,
  "corn-sweet": 81, cucumbers: 59, eggplant: 68, kohlrabi: 53, leek: 120,
  "lettuce-head": 69, "lettuce-leaf": 46, mustard: 35, okra: 54, "onions-bulb": 90,
  parsnips: 105, "snap-pea-bush": 61, "snap-pea-pole": 61, "peas-vining": 70, peppers: 76,
  "potatoes-irish": 102, "potatoes-sweet": 126, pumpkin: 103, radishes: 25, spinach: 43,
  "squash-summer": 48, "squash-winter": 93, tomatoes: 72, turnips: 45, watermelon: 82,
};

let inRange = 0, within = 0;
const diverged = [];
const gaps = [];

for (const [slug, n] of Object.entries(NMSU_DTH)) {
  const e = CROP_CATALOG[slug];
  if (!e) { gaps.push(`${slug}: not in catalog`); continue; }
  const ranges = [e.daysToMaturity.direct, e.daysToMaturity.transplant].filter(Boolean);
  if (!ranges.length) { gaps.push(`${slug}: NMSU ${n}d — catalog has no numeric DTH (could adopt NMSU)`); continue; }
  // Distance from NMSU's number to the nearest of our ranges (0 if inside one).
  const dist = Math.min(...ranges.map(([lo, hi]) => (n < lo ? lo - n : n > hi ? n - hi : 0)));
  const rs = ranges.map(([lo, hi]) => `${lo}-${hi}`).join(" / ");
  if (dist === 0) inRange += 1;
  else if (dist <= tol) within += 1;
  else diverged.push(`${slug}: NMSU ${n}d vs ours ${rs} (off by ${dist}d)`);
}

const compared = inRange + within + diverged.length;
console.log("Days-to-maturity cross-check vs NMSU CR457-B (Table 2)");
console.log("=".repeat(54));
console.log(`Compared: ${compared} crops  (+${gaps.length} gaps/skips)`);
console.log(`  inside our range: ${inRange}`);
console.log(`  within ${tol} days: ${within}`);
console.log(`  diverged (> ${tol} days): ${diverged.length}`);
if (diverged.length) { console.log("\nDivergences (review catalog DTH):"); for (const d of diverged) console.log(`  - ${d}`); }
if (gaps.length) { console.log("\nGaps:"); for (const g of gaps) console.log(`  - ${g}`); }
console.log(`\n${inRange + within}/${compared} agree within ${tol} days — independent support for the provisional catalog DTH.`);

if (strict && diverged.length) {
  console.error(`\nvalidate-dth: ${diverged.length} crops diverge > ${tol}d (--strict)`);
  process.exit(1);
}
