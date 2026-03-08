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

validateProjectStructure();

const htmlSource = readFile('index.html');
const cssSource = readFile('styles.css');

validateJavaScript('script.js');
validateJavaScript('data.js');
validateHtmlAssets(htmlSource);
validateHtmlAriaReferences(htmlSource);
validateCssCustomProperties(cssSource);

if (failures.length > 0) {
  console.error('Validation failed:\n');
  for (const message of failures) {
    console.error(`- ${message}`);
  }
  process.exit(1);
}

console.log('Validation passed');
