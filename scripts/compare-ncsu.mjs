// Cross-checks the app's outdoor planting windows against the NC State
// Extension Central NC planting calendar (AG-756), transcribed in
// scripts/ncsu-planting-dates.json.
//
// This is an informational report, not a build gate: the app's dataset
// intentionally diverges from NC State where its PLANT_REVIEW_NOTES document a
// more conservative or locally-adjusted window (Carrboro sits on the 7b/8a
// line). The job of this tool is to make every such divergence visible so a
// human can confirm it is intentional and catch the ones that are not.
//
// It compares only outdoor planting activity:
//   app codes  s / t / B  (sow outdoors, transplant, bulbs/sets)
//   NC State   S / T / B / Tu / C  (seed, transplant, bulb, tuber, crown)
// Indoor starts (si/sg) and harvest (h) are out of scope here. A ±1 half-month
// tolerance absorbs the calendar's 15-day grid resolution.
//
// Run: node scripts/compare-ncsu.mjs   (exits 0; use --strict to exit non-zero
// when any crop diverges, e.g. for a manual audit).

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

import { NCSU_NAME_MAP as NAME_MAP } from './lib/ncsu-name-map.mjs';

const rootDir = process.cwd();
const strict = process.argv.includes('--strict');

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH_CAP = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ORDER = MONTH_CAP.flatMap((m) => [`${m}_h1`, `${m}_h2`]);
const ORDER_INDEX = new Map(ORDER.map((key, i) => [key, i]));

// app plant name -> NC State crop name. null means the crop has no comparable
// NC State row (flowers, perennial herbs, fruit, ginger), so it is skipped.
// NAME_MAP is imported from ./lib/ncsu-name-map.mjs (shared with the AG-756
// validation-fixture builder).

function loadPlants() {
  const source = `${fs.readFileSync(path.join(rootDir, 'data.js'), 'utf8')}
globalThis.__PLANTS = typeof PLANTS === 'undefined' ? null : PLANTS;`;
  const context = vm.createContext({ globalThis: {} });
  new vm.Script(source, { filename: 'data.js' }).runInContext(context);
  return context.globalThis.__PLANTS;
}

function appOutdoorHalfMonths(plant) {
  const set = new Set();
  MONTHS.forEach((monthId, monthIndex) => {
    const monthData = plant.months[monthId];
    if (!monthData) return;
    ['half1', 'half2'].forEach((half, halfIndex) => {
      if ((monthData[half] || []).some((a) => a === 's' || a === 't' || a === 'B')) {
        set.add(`${MONTH_CAP[monthIndex]}_${halfIndex === 0 ? 'h1' : 'h2'}`);
      }
    });
  });
  return set;
}

function withinTolerance(key, otherSet) {
  const i = ORDER_INDEX.get(key);
  return [-1, 0, 1].some((d) => otherSet.has(ORDER[(i + d + 24) % 24]));
}

function format(keys) {
  return [...keys]
    .sort((a, b) => ORDER_INDEX.get(a) - ORDER_INDEX.get(b))
    .map((k) => k.replace('_h', ' '))
    .join(', ');
}

const fixture = JSON.parse(fs.readFileSync(path.join(rootDir, 'scripts/ncsu-planting-dates.json'), 'utf8'));
const ncsuCrops = fixture.crops;
const plants = loadPlants();
const byName = new Map(plants.map((p) => [p.name, p]));

let compared = 0;
let diverged = 0;
const missingCrops = [];
const lines = [];

for (const [appName, crop] of Object.entries(NAME_MAP)) {
  if (!crop || !byName.has(appName)) continue;
  if (!ncsuCrops[crop]) {
    missingCrops.push(`${appName} -> ${crop}`);
    continue;
  }
  compared += 1;

  const appSet = appOutdoorHalfMonths(byName.get(appName));
  const ncsuSet = new Set(Object.keys(ncsuCrops[crop]));

  const appOnly = [...appSet].filter((k) => !withinTolerance(k, ncsuSet));
  const ncsuOnly = [...ncsuSet].filter((k) => !withinTolerance(k, appSet));

  if (appOnly.length || ncsuOnly.length) {
    diverged += 1;
    lines.push(`\n${appName}  (NC State: ${crop})`);
    if (appOnly.length) lines.push(`   app adds:  ${format(appOnly)}`);
    if (ncsuOnly.length) lines.push(`   app omits: ${format(ncsuOnly)}`);
  }
}

console.log('NC State (AG-756) planting-window cross-check');
console.log('='.repeat(50));
if (missingCrops.length) {
  console.log('\nMapped to a crop missing from the fixture (fix NAME_MAP or the fixture):');
  for (const m of missingCrops) console.log(`  - ${m}`);
}
if (lines.length) console.log(lines.join('\n'));
console.log(`\n${diverged}/${compared} compared crops diverge from NC State beyond ±1 half-month.`);
console.log('Divergences are expected where a PLANT_REVIEW_NOTES entry documents the change.');

if (missingCrops.length || (strict && diverged > 0)) {
  process.exit(1);
}
