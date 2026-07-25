#!/usr/bin/env node
// Offline verifier for the NCEI frost tile shards (CI-safe: no network).
// ======================================================================
// Checks that app/data/frost/index.json and app/data/frost/tiles/*.json are
// mutually consistent and well-formed:
//   - index exists, pins ncei "1991-2020", tileSizeDeg 5, has a README string
//   - every tile listed in the index exists on disk; no unlisted tiles exist
//   - per-tile station counts match the index; total matches stationCount
//   - every station: non-empty id/name, valid lat/lng, sits in its tile,
//     well-formed FrostKeys (T in {36,32,28,24,20,16}, P in {10..90 by 10}),
//     integer day-of-year values in 1..365, both 32/50 anchors present
//   - stations are sorted by id within each tile; ids unique across tiles
//   - spot check: USC00311677 (Chapel Hill 2 W) in t35_-80 with
//     lastFrost["32/50"] = 90 and firstFrost["32/50"] = 307 (must match the
//     seed table exactly — same source, same parse)
// Exits non-zero with a clear message on the first failure.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TILE_SIZE_DEG = 5;
const FROST_KEY_RE = /^(36|32|28|24|20|16)\/(10|20|30|40|50|60|70|80|90)$/;
const REFERENCE_KEY = "32/50";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const frostDir = path.join(repoRoot, "app", "data", "frost");
const tilesDir = path.join(frostDir, "tiles");

function fail(message) {
  console.error(`verify-frost-tiles: FAIL: ${message}`);
  process.exit(1);
}

function tileKeyOf(lat, lng) {
  return `t${Math.floor(lat / TILE_SIZE_DEG) * TILE_SIZE_DEG}_${
    Math.floor(lng / TILE_SIZE_DEG) * TILE_SIZE_DEG
  }`;
}

async function readJson(filePath, label) {
  let text;
  try {
    text = await fs.readFile(filePath, "utf8");
  } catch {
    fail(`${label} not found at ${filePath}`);
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    fail(`${label} is not valid JSON: ${err.message}`);
  }
}

function checkFrostMap(map, which, stationId, tileName) {
  if (map === null || typeof map !== "object" || Array.isArray(map)) {
    fail(`station ${stationId} in ${tileName}: ${which} is not an object`);
  }
  for (const [key, value] of Object.entries(map)) {
    if (!FROST_KEY_RE.test(key)) {
      fail(`station ${stationId} in ${tileName}: malformed FrostKey "${key}" in ${which}`);
    }
    if (!Number.isInteger(value) || value < 1 || value > 365) {
      fail(
        `station ${stationId} in ${tileName}: ${which}["${key}"] = ${JSON.stringify(
          value
        )} is not an integer day-of-year in 1..365`
      );
    }
  }
  if (map[REFERENCE_KEY] === undefined) {
    fail(`station ${stationId} in ${tileName}: missing ${which}["${REFERENCE_KEY}"] anchor`);
  }
}

// ---- index ---------------------------------------------------------------

const index = await readJson(path.join(frostDir, "index.json"), "index.json");
if (typeof index.README !== "string" || index.README.length === 0) {
  fail("index.json README must be a non-empty string");
}
if (index.datasetVersions?.ncei !== "1991-2020") {
  fail(`index.json datasetVersions.ncei must be "1991-2020", got ${JSON.stringify(index.datasetVersions?.ncei)}`);
}
if (index.tileSizeDeg !== TILE_SIZE_DEG) {
  fail(`index.json tileSizeDeg must be ${TILE_SIZE_DEG}, got ${JSON.stringify(index.tileSizeDeg)}`);
}
if (index.tiles === null || typeof index.tiles !== "object" || Array.isArray(index.tiles)) {
  fail("index.json tiles must be an object of tileName -> stationCount");
}
if (!Number.isInteger(index.stationCount) || index.stationCount <= 0) {
  fail(`index.json stationCount must be a positive integer, got ${JSON.stringify(index.stationCount)}`);
}

// ---- tiles dir <-> index agreement ---------------------------------------

let onDisk;
try {
  onDisk = (await fs.readdir(tilesDir)).filter((f) => f.endsWith(".json"));
} catch {
  fail(`tiles directory not found at ${tilesDir}`);
}
const listed = new Set(Object.keys(index.tiles));
for (const name of onDisk) {
  const key = name.replace(/\.json$/, "");
  if (!listed.has(key)) fail(`tile ${name} exists on disk but is not listed in index.json`);
}
for (const key of listed) {
  if (!onDisk.includes(`${key}.json`)) fail(`tile ${key} is listed in index.json but ${key}.json is missing on disk`);
}

// ---- per-tile checks ------------------------------------------------------

const seenIds = new Set();
let total = 0;
for (const key of [...listed].sort()) {
  if (!/^t-?\d+_-?\d+$/.test(key)) fail(`tile name "${key}" is not of the form t<lat>_<lng>`);
  const tile = await readJson(path.join(tilesDir, `${key}.json`), `tile ${key}.json`);
  if (!Array.isArray(tile.stations) || tile.stations.length === 0) {
    fail(`tile ${key}: stations must be a non-empty array`);
  }
  if (tile.stations.length !== index.tiles[key]) {
    fail(`tile ${key}: has ${tile.stations.length} stations but index.json says ${index.tiles[key]}`);
  }
  let prevId = "";
  for (const s of tile.stations) {
    if (typeof s.id !== "string" || s.id.length === 0) fail(`tile ${key}: station with missing/empty id`);
    if (typeof s.name !== "string" || s.name.length === 0) fail(`station ${s.id} in ${key}: missing name`);
    if (typeof s.lat !== "number" || !Number.isFinite(s.lat) || s.lat < -90 || s.lat > 90) {
      fail(`station ${s.id} in ${key}: invalid lat ${JSON.stringify(s.lat)}`);
    }
    if (typeof s.lng !== "number" || !Number.isFinite(s.lng) || s.lng < -180 || s.lng > 180) {
      fail(`station ${s.id} in ${key}: invalid lng ${JSON.stringify(s.lng)}`);
    }
    if (tileKeyOf(s.lat, s.lng) !== key) {
      fail(`station ${s.id} at (${s.lat}, ${s.lng}) is in tile ${key} but belongs in ${tileKeyOf(s.lat, s.lng)}`);
    }
    if (seenIds.has(s.id)) fail(`station id ${s.id} appears in more than one tile`);
    seenIds.add(s.id);
    if (s.id < prevId) fail(`tile ${key}: stations not sorted by id (${s.id} after ${prevId})`);
    prevId = s.id;
    checkFrostMap(s.lastFrost, "lastFrost", s.id, key);
    checkFrostMap(s.firstFrost, "firstFrost", s.id, key);
  }
  total += tile.stations.length;
}

if (total !== index.stationCount) {
  fail(`tiles hold ${total} stations total but index.json stationCount is ${index.stationCount}`);
}

// ---- spot check: Chapel Hill 2 W must match the seed table exactly --------

const spotTile = await readJson(path.join(tilesDir, "t35_-80.json"), "tile t35_-80.json");
const chapelHill = spotTile.stations.find((s) => s.id === "USC00311677");
if (!chapelHill) fail("spot check: USC00311677 (Chapel Hill 2 W) not found in t35_-80");
if (chapelHill.lastFrost[REFERENCE_KEY] !== 90) {
  fail(`spot check: USC00311677 lastFrost["32/50"] = ${chapelHill.lastFrost[REFERENCE_KEY]}, expected 90`);
}
if (chapelHill.firstFrost[REFERENCE_KEY] !== 307) {
  fail(`spot check: USC00311677 firstFrost["32/50"] = ${chapelHill.firstFrost[REFERENCE_KEY]}, expected 307`);
}

console.log(
  `verify-frost-tiles: OK — ${total} stations across ${listed.size} tiles; ` +
    `index consistent; all FrostKeys/day-of-year values valid; Chapel Hill spot check passed`
);
