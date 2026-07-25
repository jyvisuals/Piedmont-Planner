#!/usr/bin/env node
// Offline verifier for schema/providers/data/temp-normals.json (CI-safe).
// The companion to fetch-ncei-temp-normals.mjs: no network, checks the committed
// biweekly temperature tiles are well-formed and physically sane so a bad
// regeneration can't slip through. Exits non-zero on any violation.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const FILE = path.join(rootDir, "schema/providers/data/temp-normals.json");
const SEED = path.join(rootDir, "schema/providers/data/frost-stations.json");

const fail = (msg) => { console.error(`verify-temp-normals: ${msg}`); process.exit(1); };

const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
const seedIds = new Set(JSON.parse(fs.readFileSync(SEED, "utf8")).stations.map((s) => s.id));

if (!Array.isArray(data.stations) || !data.stations.length) fail("no stations");
if (data.stationCount !== data.stations.length) fail("stationCount mismatch");

let checked = 0;
for (const s of data.stations) {
  const where = `${s.id} (${(s.name || "").trim()})`;
  if (!seedIds.has(s.id)) fail(`${where}: not a frost-stations seed id`);
  for (const key of ["tmaxF", "tminF", "tmaxSdF", "tminSdF"]) {
    if (!Array.isArray(s[key]) || s[key].length !== 24) fail(`${where}: ${key} must be length 24`);
  }
  for (let i = 0; i < 24; i++) {
    const mx = s.tmaxF[i], mn = s.tminF[i];
    // Nulls are allowed (missing slot) but must be null, not garbage.
    if (mx !== null) {
      if (typeof mx !== "number" || mx < -60 || mx > 130) fail(`${where}: tmaxF[${i}]=${mx} out of range`);
    }
    if (mn !== null) {
      if (typeof mn !== "number" || mn < -80 || mn > 110) fail(`${where}: tminF[${i}]=${mn} out of range`);
    }
    if (mx !== null && mn !== null && mn > mx + 0.01) fail(`${where}: tmin ${mn} > tmax ${mx} at slot ${i}`);
    for (const key of ["tmaxSdF", "tminSdF"]) {
      const sd = s[key][i];
      if (sd !== null && (typeof sd !== "number" || sd < 0 || sd > 40)) fail(`${where}: ${key}[${i}]=${sd} out of range`);
    }
  }
  // Physical sanity: summer must be warmer than winter somewhere in the year.
  const peak = Math.max(...s.tmaxF.filter((v) => v !== null));
  const trough = Math.min(...s.tminF.filter((v) => v !== null));
  if (!(peak - trough > 15)) fail(`${where}: implausibly flat annual range (${trough}..${peak}°F)`);
  checked += 1;
}

console.log(`verify-temp-normals: OK — ${checked} stations, 24 half-month slots each, all values sane.`);
