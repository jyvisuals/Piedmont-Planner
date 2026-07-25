#!/usr/bin/env node
// verify-zip-zones.mjs — OFFLINE verifier for the ZIP/zone shards (CI-safe).
// =============================================================================
// No network. Checks that app/data/zip/** and app/data/zones/** are internally
// consistent:
//   - both indexes exist, match the files on disk in BOTH directions, and their
//     per-file counts and totals add up;
//   - every ZIP key is 5 digits and lives in its correct 2-digit prefix shard;
//   - every tuple is [lat, lng, zone] with finite lat/lng inside plausible US
//     bounds (CONUS + AK + HI + territories incl. Guam/AS across the
//     antimeridian) and a zone matching /^([0-9]|1[0-3])[ab]$/;
//   - every zone-tile point lands in its correct floor(x/5)*5 tile;
//   - spot checks: ZIP 27510 -> zone "8a" at ~(35.9158, -79.0826) within 0.02
//     degrees; total zipCount within 10% of 33,000.
// Exits non-zero with a clear message on the first failure.

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ZIP_DIR = join(ROOT, "app", "data", "zip");
const ZONES_DIR = join(ROOT, "app", "data", "zones");
const TILE_DIR = join(ZONES_DIR, "tiles");

const ZONE_RE = /^([0-9]|1[0-3])[ab]$/;
const ZIP_RE = /^\d{5}$/;

function fail(msg) {
  console.error(`verify-zip-zones: FAIL: ${msg}`);
  process.exit(1);
}

function loadJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    fail(`cannot read/parse ${path}: ${err.message}`);
  }
}

/** Plausible US bounds: lat covers American Samoa (~-14.3) through Barrow AK
 * (~71.4); lng covers Guam (~144.7E) and the far Aleutians through the US
 * Virgin Islands (~-64.6W). Anything outside is a data error. */
function checkTuple(where, tuple) {
  if (!Array.isArray(tuple) || tuple.length !== 3) {
    fail(`${where}: tuple is not a 3-element [lat, lng, zone] array: ${JSON.stringify(tuple)}`);
  }
  const [lat, lng, zone] = tuple;
  if (typeof lat !== "number" || !Number.isFinite(lat)) fail(`${where}: non-finite lat ${lat}`);
  if (typeof lng !== "number" || !Number.isFinite(lng)) fail(`${where}: non-finite lng ${lng}`);
  if (lat < -15 || lat > 72.5) fail(`${where}: lat ${lat} outside plausible US bounds [-15, 72.5]`);
  const lngOk = (lng >= -180 && lng <= -64) || (lng >= 144 && lng <= 180);
  if (!lngOk) fail(`${where}: lng ${lng} outside plausible US bounds ([-180,-64] or [144,180])`);
  if (typeof zone !== "string" || !ZONE_RE.test(zone)) {
    fail(`${where}: zone ${JSON.stringify(zone)} does not match /^([0-9]|1[0-3])[ab]$/`);
  }
  return [lat, lng, zone];
}

function jsonFilesOnDisk(dir) {
  let names;
  try {
    names = readdirSync(dir);
  } catch (err) {
    fail(`cannot list ${dir}: ${err.message}`);
  }
  return names.filter((f) => f.endsWith(".json"));
}

// ---------------------------------------------------------------------------
// 1. ZIP prefix shards vs app/data/zip/index.json
// ---------------------------------------------------------------------------

const zipIndex = loadJson(join(ZIP_DIR, "index.json"));
if (!zipIndex.README) fail("zip index.json has no README");
if (zipIndex.datasetVersions?.phz !== "2023" || zipIndex.datasetVersions?.zcta !== "2020") {
  fail(`zip index.json datasetVersions must be { phz: "2023", zcta: "2020" }`);
}
if (!zipIndex.prefixes || typeof zipIndex.prefixes !== "object") {
  fail("zip index.json has no prefixes map");
}

const shardFilesOnDisk = jsonFilesOnDisk(ZIP_DIR).filter((f) => f !== "index.json");
for (const f of shardFilesOnDisk) {
  if (!/^\d{2}\.json$/.test(f)) fail(`unexpected file in app/data/zip/: ${f}`);
  const pp = f.slice(0, 2);
  if (!(pp in zipIndex.prefixes)) fail(`shard ${f} on disk but prefix "${pp}" not in index.json`);
}
let zipTotal = 0;
const zoneByZip = new Map(); // for cross-checks / spot checks
for (const [pp, count] of Object.entries(zipIndex.prefixes)) {
  if (!/^\d{2}$/.test(pp)) fail(`index.json prefix key "${pp}" is not 2 digits`);
  if (!shardFilesOnDisk.includes(`${pp}.json`)) {
    fail(`index.json lists prefix "${pp}" but app/data/zip/${pp}.json is missing`);
  }
  const shard = loadJson(join(ZIP_DIR, `${pp}.json`));
  const entries = Object.entries(shard);
  if (entries.length !== count) {
    fail(`prefix "${pp}": index says ${count} ZIPs, file has ${entries.length}`);
  }
  if (entries.length === 0) fail(`prefix "${pp}": shard is empty`);
  for (const [zip, tuple] of entries) {
    if (!ZIP_RE.test(zip)) fail(`app/data/zip/${pp}.json: key "${zip}" is not a 5-digit ZIP`);
    if (!zip.startsWith(pp)) fail(`ZIP ${zip} is in wrong shard ${pp}.json`);
    checkTuple(`app/data/zip/${pp}.json ${zip}`, tuple);
    zoneByZip.set(zip, tuple);
  }
  zipTotal += entries.length;
}
if (zipIndex.zipCount !== zipTotal) {
  fail(`zip index zipCount ${zipIndex.zipCount} != sum of shard entries ${zipTotal}`);
}

// ---------------------------------------------------------------------------
// 2. Zone tiles vs app/data/zones/index.json
// ---------------------------------------------------------------------------

const zonesIndex = loadJson(join(ZONES_DIR, "index.json"));
if (!zonesIndex.README) fail("zones index.json has no README");
if (zonesIndex.datasetVersions?.phz !== "2023" || zonesIndex.datasetVersions?.zcta !== "2020") {
  fail(`zones index.json datasetVersions must be { phz: "2023", zcta: "2020" }`);
}
const tileDeg = zonesIndex.tileSizeDeg;
if (tileDeg !== 5) fail(`zones index tileSizeDeg must be 5, got ${tileDeg}`);
if (!zonesIndex.tiles || typeof zonesIndex.tiles !== "object") {
  fail("zones index.json has no tiles map");
}

const tileFilesOnDisk = jsonFilesOnDisk(TILE_DIR);
for (const f of tileFilesOnDisk) {
  if (!/^t-?\d+_-?\d+\.json$/.test(f)) fail(`unexpected file in app/data/zones/tiles/: ${f}`);
  const key = f.slice(0, -".json".length);
  if (!(key in zonesIndex.tiles)) fail(`tile ${f} on disk but "${key}" not in zones index.json`);
}
let pointTotal = 0;
for (const [key, count] of Object.entries(zonesIndex.tiles)) {
  const m = /^t(-?\d+)_(-?\d+)$/.exec(key);
  if (!m) fail(`zones index tile key "${key}" is not t{LAT}_{LNG}`);
  const tLat = Number(m[1]);
  const tLng = Number(m[2]);
  if (tLat % tileDeg !== 0 || tLng % tileDeg !== 0) {
    fail(`tile "${key}" is not aligned to the ${tileDeg}-degree grid`);
  }
  if (!tileFilesOnDisk.includes(`${key}.json`)) {
    fail(`zones index lists "${key}" but app/data/zones/tiles/${key}.json is missing`);
  }
  const tile = loadJson(join(TILE_DIR, `${key}.json`));
  if (!Array.isArray(tile.points)) fail(`tile ${key}: no "points" array`);
  if (tile.points.length !== count) {
    fail(`tile "${key}": index says ${count} points, file has ${tile.points.length}`);
  }
  if (tile.points.length === 0) fail(`tile "${key}": tile is empty`);
  for (const p of tile.points) {
    const [lat, lng] = checkTuple(`tile ${key}`, p);
    if (Math.floor(lat / tileDeg) * tileDeg !== tLat || Math.floor(lng / tileDeg) * tileDeg !== tLng) {
      fail(`tile ${key}: point [${lat}, ${lng}] belongs in t${Math.floor(lat / tileDeg) * tileDeg}_${Math.floor(lng / tileDeg) * tileDeg}`);
    }
  }
  pointTotal += tile.points.length;
}
if (zonesIndex.pointCount !== pointTotal) {
  fail(`zones index pointCount ${zonesIndex.pointCount} != sum of tile points ${pointTotal}`);
}
// Both outputs come from the same join: one tile point per joined ZIP.
if (pointTotal !== zipTotal) {
  fail(`tile pointCount ${pointTotal} != zip zipCount ${zipTotal} (same join must produce both)`);
}

// ---------------------------------------------------------------------------
// 3. Spot checks
// ---------------------------------------------------------------------------

const carrboro = zoneByZip.get("27510");
if (!carrboro) fail(`spot check: ZIP 27510 missing from app/data/zip/27.json`);
const [cLat, cLng, cZone] = carrboro;
if (cZone !== "8a") fail(`spot check: ZIP 27510 zone is ${JSON.stringify(cZone)}, expected "8a"`);
if (Math.abs(cLat - 35.9158) > 0.02 || Math.abs(cLng - -79.0826) > 0.02) {
  fail(`spot check: ZIP 27510 at (${cLat}, ${cLng}), expected within 0.02 deg of (35.9158, -79.0826)`);
}

if (Math.abs(zipTotal - 33000) > 33000 * 0.1) {
  fail(`spot check: total zipCount ${zipTotal} not within 10% of 33,000`);
}

console.log(
  `verify-zip-zones: OK — ${zipTotal} ZIPs in ${shardFilesOnDisk.length} prefix shards, ` +
    `${pointTotal} points in ${tileFilesOnDisk.length} tiles; indexes match disk both ways; ` +
    `spot checks passed (27510 -> 8a @ (${cLat}, ${cLng})).`
);
