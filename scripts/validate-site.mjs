import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const rootDir = process.cwd();
const failures = [];

function fail(message) {
  failures.push(message);
}

function readFile(relPath) {
  return fs.readFileSync(path.join(rootDir, relPath), 'utf8');
}

function assertFileExists(relPath) {
  if (!fs.existsSync(path.join(rootDir, relPath))) {
    fail(`Missing required file: ${relPath}`);
  }
}

function validateJavaScript(relPath) {
  const source = readFile(relPath);
  try {
    new vm.Script(source, { filename: relPath });
  } catch (error) {
    fail(`JavaScript syntax error in ${relPath}: ${error.message}`);
  }
}

function validateHtmlAssets(htmlSource) {
  const assetMatches = htmlSource.matchAll(/(?:src|href)="([^"]+)"/g);
  for (const [, assetPath] of assetMatches) {
    if (
      assetPath.startsWith('http://') ||
      assetPath.startsWith('https://') ||
      assetPath.startsWith('#')
    ) {
      continue;
    }

    assertFileExists(assetPath);
  }
}

function validateHtmlAriaReferences(htmlSource) {
  const ids = new Set([...htmlSource.matchAll(/id="([^"]+)"/g)].map(([, id]) => id));
  const attrs = ['aria-labelledby', 'aria-describedby', 'for'];

  for (const attr of attrs) {
    const attrMatches = htmlSource.matchAll(new RegExp(`${attr}="([^"]+)"`, 'g'));
    for (const [, refList] of attrMatches) {
      for (const ref of refList.split(/\s+/).filter(Boolean)) {
        if (!ids.has(ref)) {
          fail(`Broken ${attr} reference: ${ref}`);
        }
      }
    }
  }
}

function validateCssCustomProperties(cssSource) {
  const defined = new Set([...cssSource.matchAll(/--([A-Za-z0-9-_]+)\s*:/g)].map(([, name]) => name));
  const referenced = new Set([...cssSource.matchAll(/var\(--([A-Za-z0-9-_]+)\)/g)].map(([, name]) => name));

  for (const name of [...referenced].sort()) {
    if (!defined.has(name)) {
      fail(`Undefined CSS custom property: --${name}`);
    }
  }
}

function validateProjectStructure() {
  ['index.html', 'styles.css', 'script.js', 'data.js'].forEach(assertFileExists);
}

function loadCalendarData(relPath) {
  const source = `${readFile(relPath)}
globalThis.__calendarData = {
  MONTHS: typeof MONTHS === 'undefined' ? null : MONTHS,
  TASKS: typeof TASKS === 'undefined' ? null : TASKS,
  PLANTS: typeof PLANTS === 'undefined' ? null : PLANTS,
  PLANT_GUIDE: typeof PLANT_GUIDE === 'undefined' ? null : PLANT_GUIDE,
  PLANT_REVIEW_NOTES: typeof PLANT_REVIEW_NOTES === 'undefined' ? null : PLANT_REVIEW_NOTES,
  PLANT_REVIEW_CONFIDENCE_GROUPS:
    typeof PLANT_REVIEW_CONFIDENCE_GROUPS === 'undefined' ? null : PLANT_REVIEW_CONFIDENCE_GROUPS
};`;

  const context = vm.createContext({ globalThis: {} });
  try {
    new vm.Script(source, { filename: relPath }).runInContext(context);
  } catch (error) {
    fail(`Unable to evaluate ${relPath} for data validation: ${error.message}`);
    return null;
  }

  return context.globalThis.__calendarData;
}

function validateDataset(relPath) {
  const dataset = loadCalendarData(relPath);
  if (!dataset?.PLANTS) {
    return;
  }

  const plantNames = dataset.PLANTS.map((plant) => plant.name);
  const uniquePlantNames = new Set(plantNames);
  if (uniquePlantNames.size !== plantNames.length) {
    fail(`Duplicate plant names found in ${relPath}`);
  }

  if (!dataset.MONTHS) {
    fail(`Missing MONTHS in ${relPath}`);
  } else {
    for (const month of dataset.MONTHS) {
      if (!dataset.TASKS?.[month.id]) {
        fail(`Missing TASKS entry for month: ${month.id}`);
      }
      for (const plant of dataset.PLANTS) {
        const monthData = plant.months?.[month.id];
        if (!Array.isArray(monthData?.half1) || !Array.isArray(monthData?.half2)) {
          fail(`Plant "${plant.name}" is missing half1/half2 arrays for month: ${month.id}`);
        }
      }
    }
  }

  if (dataset.PLANT_GUIDE) {
    for (const guideName of Object.keys(dataset.PLANT_GUIDE)) {
      if (!uniquePlantNames.has(guideName)) {
        fail(`Orphan PLANT_GUIDE entry with no matching plant: ${guideName}`);
      }
    }
  }

  if (dataset.PLANT_REVIEW_NOTES) {
    for (const plantName of plantNames) {
      if (!Object.prototype.hasOwnProperty.call(dataset.PLANT_REVIEW_NOTES, plantName)) {
        fail(`Missing PLANT_REVIEW_NOTES entry for plant: ${plantName}`);
      }
    }
  }

  validateTimingConsistency(dataset);

  if (dataset.PLANT_REVIEW_CONFIDENCE_GROUPS) {
    const confidenceCounts = new Map();
    for (const groupNames of Object.values(dataset.PLANT_REVIEW_CONFIDENCE_GROUPS)) {
      for (const plantName of groupNames) {
        confidenceCounts.set(plantName, (confidenceCounts.get(plantName) ?? 0) + 1);
      }
    }

    for (const plantName of plantNames) {
      const count = confidenceCounts.get(plantName) ?? 0;
      if (count !== 1) {
        fail(`Plant must appear exactly once in confidence groups: ${plantName}`);
      }
    }

    for (const plantName of confidenceCounts.keys()) {
      if (!uniquePlantNames.has(plantName)) {
        fail(`Confidence group references unknown plant: ${plantName}`);
      }
    }
  }
}

// Agronomic consistency checks for the timing data itself. These encode Zone 8a
// invariants (Carrboro sits on the 7b/8a line: average last frost ~mid-April,
// first frost ~early November) and internal logic the data must satisfy.
// Exceptions justified by a PLANT_REVIEW_NOTES entry belong in the allowlists.

// Crops planted from purchased crowns, slips, sets, or nursery stock: a
// transplant window without an indoor-sow lead-in is expected.
const NURSERY_STOCK_PLANTS = new Set([
  'Asparagus',
  'Blackberries',
  'Blueberries',
  'Ginger',
  'Mint',
  'Oregano',
  'Potatoes (Sweet)',
  'Rosemary',
  'Strawberries (Bare-root)',
  'Thyme',
]);

// Frost-tender crops with a reviewed, source-backed planting window outside the
// generic frost bounds (see the plant's PLANT_REVIEW_NOTES entry).
const TENDER_FROST_ALLOW = new Set([
  'Corn (Sweet)', // review note: NC State Central NC row supports mid-March sowing
]);

// Intentional single-slot windows (see the plant's PLANT_REVIEW_NOTES entry).
const ISOLATED_SLOT_ALLOW = new Set([
  'Parsnips', // review note: deliberate October sg shoulder for overwinter sowing
]);

const TENDER_CROP_PATTERN = /tomato|pepper|eggplant|okra|basil|cucumber|squash|melon|cantaloupe|watermelon|corn|bean|pumpkin|sweet potato|potatoes \(sweet\)|zinnia|marigold|sunflower|nasturtium|moonflower|ginger|lima/i;
const HALF_MONTHS = 24;
const DAYS_PER_HALF_MONTH = 15.2;
const LAST_FROST_INDEX = 6; // Apr h1: earliest plausible outdoor slot for tender crops
const FALL_TENDER_CUTOFF_INDEX = 17; // Sep h2: tender outdoor planting after this is suspect

function validateTimingConsistency(dataset) {
  if (!dataset.MONTHS || !dataset.PLANTS) return;

  const halfMonthLabel = (index) =>
    `${dataset.MONTHS[Math.floor(index / 2)].short} ${index % 2 === 0 ? 'h1' : 'h2'}`;

  for (const plant of dataset.PLANTS) {
    const slots = dataset.MONTHS.flatMap((month) => {
      const monthData = plant.months?.[month.id];
      return [monthData?.half1 ?? [], monthData?.half2 ?? []];
    });

    const plantingIndexes = [];
    const harvestIndexes = [];
    let hasTransplant = false;
    let hasIndoorSow = false;

    slots.forEach((activities, index) => {
      if (activities.some((a) => ['s', 't', 'B'].includes(a))) plantingIndexes.push(index);
      if (activities.includes('h')) harvestIndexes.push(index);
      if (activities.includes('t') || activities.includes('tg')) hasTransplant = true;
      if (activities.includes('si') || activities.includes('sg')) hasIndoorSow = true;
    });

    // 1. A transplant window implies an indoor/greenhouse sowing somewhere in
    //    the year, unless the crop is planted from nursery stock.
    if (hasTransplant && !hasIndoorSow && !NURSERY_STOCK_PLANTS.has(plant.name)) {
      fail(
        `Timing: "${plant.name}" has a transplant window but no si/sg sowing all year ` +
          `(add the sowing window, or add to NURSERY_STOCK_PLANTS with a review note)`
      );
    }

    // 2. Frost-tender crops should not be planted outdoors before the average
    //    last frost or too late in fall to mature.
    if (TENDER_CROP_PATTERN.test(plant.name) && !TENDER_FROST_ALLOW.has(plant.name)) {
      for (const index of plantingIndexes) {
        if (index < LAST_FROST_INDEX) {
          fail(
            `Timing: tender crop "${plant.name}" planted outdoors at ${halfMonthLabel(index)}, ` +
              `before the average last frost`
          );
        }
        if (index > FALL_TENDER_CUTOFF_INDEX) {
          fail(
            `Timing: tender crop "${plant.name}" planted outdoors at ${halfMonthLabel(index)}, ` +
              `too late to mature before first frost`
          );
        }
      }
    }

    // 3. Harvest lag: at least one planting season must have its first harvest
    //    arrive no sooner than ~days-to-harvest allows. (Successive seasons can
    //    legitimately merge into an earlier season's harvest tail, so only flag
    //    when no season has a plausible lag.)
    const minDaysMatch = String(plant.daysToHarvest || '').match(/\d+/);
    const minDays = minDaysMatch ? Number(minDaysMatch[0]) : null;
    if (minDays && plantingIndexes.length > 0 && harvestIndexes.length > 0) {
      const seasonStarts = plantingIndexes.filter(
        (index) => !plantingIndexes.includes((index + HALF_MONTHS - 1) % HALF_MONTHS)
      );
      const plausible = (seasonStarts.length ? seasonStarts : [plantingIndexes[0]]).some(
        (start) => {
          const gap = Math.min(
            ...harvestIndexes.map((h) => (h - start + HALF_MONTHS) % HALF_MONTHS || HALF_MONTHS)
          );
          // 0.5x with the 15-day grid resolution: catches gross errors without
          // flagging windows that round to an adjacent half-month.
          return gap * DAYS_PER_HALF_MONTH >= minDays * 0.5;
        }
      );
      if (!plausible) {
        fail(
          `Timing: "${plant.name}" first harvest arrives implausibly soon after every ` +
            `planting season (daysToHarvest: ${plant.daysToHarvest})`
        );
      }
    }

    // 4. Vegetables with a days-to-harvest figure and a planting window should
    //    have a harvest window.
    if (
      plant.type === 'vegetable' &&
      minDays &&
      plantingIndexes.length > 0 &&
      harvestIndexes.length === 0
    ) {
      fail(`Timing: vegetable "${plant.name}" has daysToHarvest (${plant.daysToHarvest}) but no harvest window`);
    }

    // 5. A single active slot with empty neighbors is usually a typo.
    if (!ISOLATED_SLOT_ALLOW.has(plant.name)) {
      slots.forEach((activities, index) => {
        const meaningful = activities.filter((a) => a !== 'h' && a !== '*');
        if (meaningful.length === 0) return;
        const prev = slots[(index + HALF_MONTHS - 1) % HALF_MONTHS];
        const next = slots[(index + 1) % HALF_MONTHS];
        if (prev.length === 0 && next.length === 0) {
          fail(
            `Timing: "${plant.name}" has an isolated [${meaningful.join(',')}] slot at ` +
              `${halfMonthLabel(index)} (fix it, or add to ISOLATED_SLOT_ALLOW with a review note)`
          );
        }
      });
    }
  }
}

validateProjectStructure();

const htmlSource = readFile('index.html');
const cssSource = readFile('styles.css');

validateJavaScript('script.js');
validateJavaScript('data.js');
validateHtmlAssets(htmlSource);
validateHtmlAriaReferences(htmlSource);
validateCssCustomProperties(cssSource);
validateDataset('data.js');

if (failures.length > 0) {
  console.error('Validation failed:\n');
  for (const message of failures) {
    console.error(`- ${message}`);
  }
  process.exit(1);
}

console.log('Validation passed');
