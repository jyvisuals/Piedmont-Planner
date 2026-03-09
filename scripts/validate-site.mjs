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
  ['index.html', 'styles.css', 'script.js', 'data.js', 'data.carrboro-review.js'].forEach(assertFileExists);
}

function loadCalendarData(relPath) {
  const source = `${readFile(relPath)}
globalThis.__calendarData = {
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

function validateCarrboroDataset() {
  const dataset = loadCalendarData('data.carrboro-review.js');
  if (!dataset?.PLANTS) {
    return;
  }

  const plantNames = dataset.PLANTS.map((plant) => plant.name);
  const uniquePlantNames = new Set(plantNames);
  if (uniquePlantNames.size !== plantNames.length) {
    fail('Duplicate plant names found in data.carrboro-review.js');
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

validateProjectStructure();

const htmlSource = readFile('index.html');
const cssSource = readFile('styles.css');

validateJavaScript('script.js');
validateJavaScript('data.js');
validateJavaScript('data.carrboro-review.js');
validateHtmlAssets(htmlSource);
validateHtmlAriaReferences(htmlSource);
validateCssCustomProperties(cssSource);
validateCarrboroDataset();

if (failures.length > 0) {
  console.error('Validation failed:\n');
  for (const message of failures) {
    console.error(`- ${message}`);
  }
  process.exit(1);
}

console.log('Validation passed');
