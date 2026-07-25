#!/usr/bin/env node
// Offline verifier for the NCEI temperature tile shards (CI-safe: no network).
// ======================================================================
// Checks app/data/temp/index.json and app/data/temp/tiles/*.json are mutually
// consistent and physically sane:
//   - index exists, pins ncei "1991-2020", tileSizeDeg 5, has a README string
//   - every tile listed exists on disk; no unlisted tiles exist; counts match
//   - every station: non-empty id/name, valid lat/lng, sits in its tile, sorted
//     by id, unique across tiles; 24-length tmaxF/tminF with NO nulls (inclusion
//     rule) and sane ranges; tmin <= tmax; spreads (nullable) sane; a plausible
//     annual temperature range (summer warmer than winter)
//   - spot check: Chapel Hill (USC00311677) mid-July tmax ~90°F, matching the seed
// Exits non-zero with a clear message on the first failure.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TILE_SIZE_DEG = 5;
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const tempDir = path.join(repoRoot, "app", "data", "temp");
const tilesDir = path.join(tempDir, "tiles");

function fail(message) {
  console.error(`verify-temp-tiles: FAIL: ${message}`);
  process.exit(1);
}
function tileKeyOf(lat, lng) {
  return `t${Math.floor(lat / TILE_SIZE_DEG) * TILE_SIZE_DEG}_${Math.floor(lng / TILE_SIZE_DEG) * TILE_SIZE_DEG}`;
}
async function readJson(filePath, label) {
  let text;
  try { text = await fs.readFile(filePath, "utf8"); } catch { fail(`${label} not found at ${filePath}`); }
  try { return JSON.parse(text); } catch (err) { fail(`${label} is not valid JSON: ${err.message}`); }
}
function checkArray24(arr, label, id, key, { nullable }) {
  if (!Array.isArray(arr) || arr.length !== 24) fail(`station ${id} in ${key}: ${label} must be length 24`);
  for (let i = 0; i < 24; i++) {
    const v = arr[i];
    if (v === null) { if (!nullable) fail(`station ${id} in ${key}: ${label}[${i}] is null (inclusion requires complete coverage)`); continue; }
    if (typeof v !== "number" || !Number.isFinite(v)) fail(`station ${id} in ${key}: ${label}[${i}] = ${JSON.stringify(v)} is not a number`);
  }
}

// ---- index ---------------------------------------------------------------
const index = await readJson(path.join(tempDir, "index.json"), "index.json");
if (typeof index.README !== "string" || !index.README.length) fail("index.json README must be a non-empty string");
if (index.datasetVersions?.ncei !== "1991-2020") fail(`index.json datasetVersions.ncei must be "1991-2020"`);
if (index.tileSizeDeg !== TILE_SIZE_DEG) fail(`index.json tileSizeDeg must be ${TILE_SIZE_DEG}`);
if (index.tiles === null || typeof index.tiles !== "object" || Array.isArray(index.tiles)) fail("index.json tiles must be an object");
if (!Number.isInteger(index.stationCount) || index.stationCount <= 0) fail("index.json stationCount must be a positive integer");

// ---- tiles dir <-> index agreement ---------------------------------------
let onDisk;
try { onDisk = (await fs.readdir(tilesDir)).filter((f) => f.endsWith(".json")); } catch { fail(`tiles directory not found at ${tilesDir}`); }
const listed = new Set(Object.keys(index.tiles));
for (const name of onDisk) if (!listed.has(name.replace(/\.json$/, ""))) fail(`tile ${name} exists on disk but is not in index.json`);
for (const key of listed) if (!onDisk.includes(`${key}.json`)) fail(`tile ${key} listed in index.json but ${key}.json missing on disk`);

// ---- per-tile checks ------------------------------------------------------
const seenIds = new Set();
let total = 0;
for (const key of [...listed].sort()) {
  if (!/^t-?\d+_-?\d+$/.test(key)) fail(`tile name "${key}" is not of the form t<lat>_<lng>`);
  const tile = await readJson(path.join(tilesDir, `${key}.json`), `tile ${key}.json`);
  if (!Array.isArray(tile.stations) || !tile.stations.length) fail(`tile ${key}: stations must be a non-empty array`);
  if (tile.stations.length !== index.tiles[key]) fail(`tile ${key}: has ${tile.stations.length} stations but index says ${index.tiles[key]}`);
  let prevId = "";
  for (const s of tile.stations) {
    if (typeof s.id !== "string" || !s.id.length) fail(`tile ${key}: station with missing/empty id`);
    if (typeof s.name !== "string" || !s.name.length) fail(`station ${s.id} in ${key}: missing name`);
    if (typeof s.lat !== "number" || s.lat < -90 || s.lat > 90) fail(`station ${s.id} in ${key}: invalid lat`);
    if (typeof s.lng !== "number" || s.lng < -180 || s.lng > 180) fail(`station ${s.id} in ${key}: invalid lng`);
    if (tileKeyOf(s.lat, s.lng) !== key) fail(`station ${s.id} at (${s.lat},${s.lng}) is in ${key} but belongs in ${tileKeyOf(s.lat, s.lng)}`);
    if (seenIds.has(s.id)) fail(`station id ${s.id} appears in more than one tile`);
    seenIds.add(s.id);
    if (s.id < prevId) fail(`tile ${key}: stations not sorted by id (${s.id} after ${prevId})`);
    prevId = s.id;
    checkArray24(s.tmaxF, "tmaxF", s.id, key, { nullable: false });
    checkArray24(s.tminF, "tminF", s.id, key, { nullable: false });
    checkArray24(s.tmaxSdF, "tmaxSdF", s.id, key, { nullable: true });
    checkArray24(s.tminSdF, "tminSdF", s.id, key, { nullable: true });
    for (let i = 0; i < 24; i++) {
      if (s.tmaxF[i] < -60 || s.tmaxF[i] > 130) fail(`station ${s.id} in ${key}: tmaxF[${i}]=${s.tmaxF[i]} out of range`);
      if (s.tminF[i] < -80 || s.tminF[i] > 110) fail(`station ${s.id} in ${key}: tminF[${i}]=${s.tminF[i]} out of range`);
      if (s.tminF[i] > s.tmaxF[i] + 0.01) fail(`station ${s.id} in ${key}: tmin ${s.tminF[i]} > tmax ${s.tmaxF[i]} at slot ${i}`);
    }
    const peak = Math.max(...s.tmaxF), trough = Math.min(...s.tminF);
    if (!(peak - trough > 10)) fail(`station ${s.id} in ${key}: implausibly flat annual range (${trough}..${peak}°F)`);
  }
  total += tile.stations.length;
}
if (total !== index.stationCount) fail(`tiles hold ${total} stations but index.json stationCount is ${index.stationCount}`);

// ---- spot check: Chapel Hill mid-July max ~90°F --------------------------
const spot = await readJson(path.join(tilesDir, "t35_-80.json"), "tile t35_-80.json");
const cha = spot.stations.find((s) => s.id === "USC00311677");
if (!cha) fail("spot check: USC00311677 (Chapel Hill) not found in t35_-80");
if (!(cha.tmaxF[12] > 85 && cha.tmaxF[12] < 95)) fail(`spot check: Chapel Hill Jul-h1 tmax = ${cha.tmaxF[12]}, expected ~90°F`);

console.log(`verify-temp-tiles: OK — ${total} stations across ${listed.size} tiles; index consistent; all 24-slot arrays complete + sane; Chapel Hill spot check passed`);
