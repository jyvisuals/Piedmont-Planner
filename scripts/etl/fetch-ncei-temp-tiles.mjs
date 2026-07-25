#!/usr/bin/env node
// ETL: NCEI 1991-2020 Daily Temperature Normals -> national biweekly temp tiles.
// =====================================================================
// The national companion to scripts/etl/fetch-ncei-temp-normals.mjs (which does
// only the 17-city seed). Streams NOAA's single archive tarball of per-station
// DAILY normals CSVs, compacts each station's 365-day DLY-TMAX/TMIN-NORMAL (+
// STDDEV) to the 24 half-month slots, and emits 5°x5° tile shards under
// app/data/temp/tiles/ plus app/data/temp/index.json — the same lazy-load shape
// as the frost tiles. This is Step 4 of docs/climate-suitability-model.md: real
// heat-wall data everywhere, so the climate-suitability engine (and its frost-
// free desert calendars + reason codes) reaches the whole country, not just the
// seed cities.
//
// NOT run in CI — a manual, rare regeneration step (like the frost ETL). The
// offline companion scripts/etl/verify-temp-tiles.mjs IS CI-safe.
//
// Node built-ins only. Usage:
//   node scripts/etl/fetch-ncei-temp-tiles.mjs               # download + build
//   node scripts/etl/fetch-ncei-temp-tiles.mjs --tarball P   # reuse local tarball
//
// Honesty rules (D8): every value is parsed from the fetched NCEI CSVs; nothing
// is estimated or invented. Sentinels are OMITTED; a station without complete
// TMAX+TMIN annual coverage is dropped whole rather than gap-filled here.

import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGunzip } from "node:zlib";

const TARBALL_URL =
  "https://noaa-normals-pds.s3.amazonaws.com/normals-daily/1991-2020/archive/" +
  "us-climate-normals_1991-2020_v1.0.1_daily_multivariate_by-station_c20230404.tar.gz";
const EXPECTED_BYTES = 302646980;
// Pinned after the first successful run (the script computes + prints it when
// null, and this constant is then set to that verified value).
const EXPECTED_MD5 = "3864720a5b3d0a1873831819ecd2cb9b";
const CANONICAL_ACCESS_URL =
  "https://www.ncei.noaa.gov/data/normals-daily/1991-2020/access/<STATION_ID>.csv";

const TILE_SIZE_DEG = 5;
// GHCN id country prefixes for the U.S. + territories (mirrors the frost ETL).
const US_PREFIXES = new Set(["US", "AQ", "CQ", "GQ", "JQ", "MQ", "RQ", "VQ", "WQ", "FQ", "HQ", "DQ", "LQ", "BQ", "KQ"]);

// --- calendar geometry: 24 half-month slots (non-leap) -----------------------
const MONTH_LEN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const SLOT_OF_DOY = (() => {
  const map = new Array(366);
  let day = 1;
  MONTH_LEN.forEach((len, m) => {
    for (let d = 1; d <= len; d++) { map[day] = m * 2 + (d <= 15 ? 0 : 1); day += 1; }
  });
  return map;
})();
function doy(month, dayOfMonth) {
  let d = dayOfMonth;
  for (let m = 0; m < month - 1; m++) d += MONTH_LEN[m];
  return d;
}

// --- CSV (RFC-4180-ish: quoted fields, doubled quotes) -----------------------
function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else quoted = false; }
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}
function num(raw) {
  if (raw === undefined) return null;
  const s = raw.trim();
  if (!s || s === "-9999" || s === "-9999.0") return null;
  const v = Number(s);
  if (!Number.isFinite(v) || v <= -900) return null;
  return v;
}
const round1 = (v) => Math.round(v * 10) / 10;

// --- streaming tar reader (ustar/pax) — copied from the frost ETL ------------
const BLOCK = 512;
function parseOctal(buf, start, len) {
  const s = buf.toString("ascii", start, start + len).replace(/\0.*$/, "").trim();
  return s ? parseInt(s, 8) : 0;
}
async function* tarEntries(stream) {
  let pending = [];
  let pendingLen = 0;
  let need = BLOCK;
  let state = "header";
  let current = null;
  let longName = null;
  const take = (n) => {
    const buf = pendingLen === pending[0]?.length && pending.length === 1 ? pending[0] : Buffer.concat(pending, pendingLen);
    const head = buf.subarray(0, n);
    const rest = buf.subarray(n);
    pending = rest.length ? [rest] : [];
    pendingLen = rest.length;
    return head;
  };
  for await (const chunk of stream) {
    pending.push(chunk);
    pendingLen += chunk.length;
    while (state !== "done" && pendingLen >= need) {
      if (state === "header") {
        const header = take(BLOCK);
        if (header.every((b) => b === 0)) { state = "done"; break; }
        const typeflag = String.fromCharCode(header[156] || 0x30);
        const size = parseOctal(header, 124, 12);
        let name = header.toString("utf8", 0, 100).replace(/\0.*$/, "");
        const prefix = header.toString("utf8", 345, 500).replace(/\0.*$/, "");
        if (prefix) name = `${prefix}/${name}`;
        if (longName !== null) { name = longName; longName = null; }
        const padded = Math.ceil(size / BLOCK) * BLOCK;
        if (typeflag === "L") current = { kind: "longname", size, padded };
        else if (typeflag === "0" || typeflag === "\0") current = { kind: "file", name, size, padded };
        else current = { kind: "skip", size, padded };
        state = "body";
        need = current.padded;
        if (need === 0) {
          if (current.kind === "file") yield { name: current.name, body: Buffer.alloc(0) };
          state = "header"; need = BLOCK;
        }
      } else if (state === "body") {
        const raw = take(current.padded);
        const body = raw.subarray(0, current.size);
        if (current.kind === "file") yield { name: current.name, body };
        else if (current.kind === "longname") longName = body.toString("utf8").replace(/\0.*$/, "");
        state = "header"; need = BLOCK;
      }
    }
    if (state === "done") break;
  }
}

async function downloadTo(filePath, url) {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`download failed: HTTP ${res.status} for ${url}`);
  const out = createWriteStream(filePath);
  const { Readable } = await import("node:stream");
  const { pipeline } = await import("node:stream/promises");
  await pipeline(Readable.fromWeb(res.body), out);
}

async function verifyTarball(filePath) {
  const stat = await fs.stat(filePath);
  if (stat.size !== EXPECTED_BYTES) {
    throw new Error(`tarball size mismatch: got ${stat.size}, expected ${EXPECTED_BYTES} — refusing to parse`);
  }
  const hash = createHash("md5");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  const md5 = hash.digest("hex");
  if (EXPECTED_MD5 && md5 !== EXPECTED_MD5) {
    throw new Error(`tarball md5 mismatch: got ${md5}, expected ${EXPECTED_MD5} — refusing to parse`);
  }
  if (!EXPECTED_MD5) console.log(`NOTE: EXPECTED_MD5 is null — computed md5 ${md5}; pin it in the script.`);
  return { size: stat.size, md5 };
}

/** Parse one per-station DAILY CSV -> compacted 24-slot record, or null. */
function stationFromCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 3) return null;
  const H = parseCsvLine(lines[0]);
  const col = new Map(H.map((n, i) => [n, i]));
  const ci = {
    station: col.get("STATION"), name: col.get("NAME"),
    lat: col.get("LATITUDE"), lng: col.get("LONGITUDE"), elev: col.get("ELEVATION"),
    month: col.get("month"), day: col.get("day"),
    tmax: col.get("DLY-TMAX-NORMAL"), tmin: col.get("DLY-TMIN-NORMAL"),
    tmaxSd: col.get("DLY-TMAX-STDDEV"), tminSd: col.get("DLY-TMIN-STDDEV"),
  };
  for (const k of ["station", "lat", "lng", "month", "day", "tmax", "tmin"]) {
    if (ci[k] === undefined) return null;
  }
  const first = parseCsvLine(lines[1]);
  const id = (first[ci.station] ?? "").trim();
  const name = (first[ci.name] ?? "").trim();
  const lat = Number.parseFloat(first[ci.lat]);
  const lng = Number.parseFloat(first[ci.lng]);
  // Station elevation (meters), for elevation-aware selection + lapse correction.
  const elevRaw = ci.elev !== undefined ? num(first[ci.elev]) : null;
  const elevM = elevRaw === null ? null : Math.round(elevRaw);
  if (!id || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (!US_PREFIXES.has(id.slice(0, 2))) return null;

  const acc = Array.from({ length: 24 }, () => ({ tmax: [], tmin: [], tmaxSd: [], tminSd: [] }));
  for (let r = 1; r < lines.length; r++) {
    const f = parseCsvLine(lines[r]);
    const month = Number(f[ci.month]);
    const dayOfMonth = Number(f[ci.day]);
    if (!(month >= 1 && month <= 12) || !(dayOfMonth >= 1 && dayOfMonth <= MONTH_LEN[month - 1])) continue;
    const a = acc[SLOT_OF_DOY[doy(month, dayOfMonth)]];
    const tmax = num(f[ci.tmax]), tmin = num(f[ci.tmin]);
    if (tmax !== null) a.tmax.push(tmax);
    if (tmin !== null) a.tmin.push(tmin);
    if (ci.tmaxSd !== undefined) { const v = num(f[ci.tmaxSd]); if (v !== null) a.tmaxSd.push(v); }
    if (ci.tminSd !== undefined) { const v = num(f[ci.tminSd]); if (v !== null) a.tminSd.push(v); }
  }
  const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
  const tmaxF = [], tminF = [], tmaxSdF = [], tminSdF = [];
  for (let s = 0; s < 24; s++) {
    const a = acc[s];
    const mx = mean(a.tmax), mn = mean(a.tmin);
    tmaxF.push(mx === null ? null : round1(mx));
    tminF.push(mn === null ? null : round1(mn));
    const sx = mean(a.tmaxSd), sn = mean(a.tminSd);
    tmaxSdF.push(sx === null ? null : round1(sx));
    tminSdF.push(sn === null ? null : round1(sn));
  }
  // Inclusion rule: complete annual TMAX + TMIN coverage (all 24 slots). A
  // station missing any slot is dropped whole rather than gap-filled here — the
  // suitability engine's climate curve needs every slot to be real.
  if (tmaxF.some((v) => v === null) || tminF.some((v) => v === null)) return null;
  return { id, name, lat, lng, elevM, tmaxF, tminF, tmaxSdF, tminSdF };
}

function tileKey(lat, lng) {
  const la = Math.floor(lat / TILE_SIZE_DEG) * TILE_SIZE_DEG;
  const lo = Math.floor(lng / TILE_SIZE_DEG) * TILE_SIZE_DEG;
  return `t${la}_${lo}`;
}

async function main() {
  const args = process.argv.slice(2);
  let tarballArg = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--tarball") tarballArg = args[++i];
    else throw new Error(`unknown argument: ${args[i]}`);
  }
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(scriptDir, "..", "..");
  const tempDir = path.join(repoRoot, "app", "data", "temp");
  const tilesDir = path.join(tempDir, "tiles");

  let tarballPath = tarballArg ? path.resolve(tarballArg) : null;
  let tmpDir = null;
  if (!tarballPath) {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ncei-tempdaily-"));
    tarballPath = path.join(tmpDir, "ncei-daily.tar.gz");
    console.log(`downloading ${TARBALL_URL} (~289 MB)`);
    await downloadTo(tarballPath, TARBALL_URL);
  }
  console.log(`verifying ${tarballPath}`);
  const { size, md5 } = await verifyTarball(tarballPath);
  console.log(`ok: ${size} bytes, md5 ${md5}`);

  const stations = [];
  let csvSeen = 0, skippedForeign = 0, skippedIncomplete = 0;
  const gunzip = createReadStream(tarballPath).pipe(createGunzip());
  for await (const { name, body } of tarEntries(gunzip)) {
    if (!name.toLowerCase().endsWith(".csv")) continue;
    csvSeen++;
    const station = stationFromCsv(body.toString("utf8"));
    if (station) stations.push(station);
    else {
      const idGuess = path.basename(name).slice(0, 2);
      if (!US_PREFIXES.has(idGuess)) skippedForeign++;
      else skippedIncomplete++;
    }
    if (csvSeen % 2000 === 0) console.log(`  ...${csvSeen} CSVs scanned, kept ${stations.length}`);
  }
  console.log(`scanned ${csvSeen} CSVs: kept ${stations.length}, skipped ${skippedIncomplete} incomplete, ${skippedForeign} non-US`);
  if (!stations.length) throw new Error("no qualifying stations — aborting");

  const tiles = new Map();
  for (const s of stations) {
    const key = tileKey(s.lat, s.lng);
    if (!tiles.has(key)) tiles.set(key, []);
    tiles.get(key).push(s);
  }
  for (const list of tiles.values()) list.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const sortedKeys = [...tiles.keys()].sort();

  await fs.rm(tilesDir, { recursive: true, force: true });
  await fs.mkdir(tilesDir, { recursive: true });
  for (const key of sortedKeys) {
    await fs.writeFile(path.join(tilesDir, `${key}.json`), JSON.stringify({ stations: tiles.get(key) }));
  }

  const fetchedAt = new Date().toISOString().slice(0, 10);
  const index = {
    README:
      "NCEI U.S. Climate Normals 1991-2020 DAILY temperature normals, compacted to 24 half-month slots, full-coverage tile shards. " +
      `Source: single NOAA Open Data Dissemination archive tarball ${TARBALL_URL} (${EXPECTED_BYTES} bytes, md5 ${md5}, fetched ${fetchedAt}); ` +
      `the bucket is NOAA-operated and mirrors the canonical per-station files at ${CANONICAL_ACCESS_URL}. ` +
      "Per station, for each of 24 half-month slots (jan h1..dec h2): tmaxF/tminF = mean of DLY-TMAX/TMIN-NORMAL over the slot's days (degF); " +
      "tmaxSdF/tminSdF = mean of DLY-TMAX/TMIN-STDDEV (interannual spread, degF, null when absent). Sentinels (-9999, blank) are OMITTED; a station " +
      "is included only with COMPLETE annual TMAX+TMIN coverage (all 24 slots). id/name/lat/lng/elevM (meters) verbatim from STATION/NAME/LATITUDE/LONGITUDE/ELEVATION. " +
      "Coverage: US states + territories (GHCN prefixes US/AQ/CQ/GQ/JQ/MQ/RQ/VQ/WQ/...); foreign stations excluded. Tiles are 5-degree squares keyed " +
      "t<floor(lat/5)*5>_<floor(lng/5)*5>. Regenerate with scripts/etl/fetch-ncei-temp-tiles.mjs; verify offline with scripts/etl/verify-temp-tiles.mjs.",
    datasetVersions: { ncei: "1991-2020" },
    tileSizeDeg: TILE_SIZE_DEG,
    tiles: Object.fromEntries(sortedKeys.map((k) => [k, tiles.get(k).length])),
    stationCount: stations.length,
  };
  await fs.writeFile(path.join(tempDir, "index.json"), JSON.stringify(index, null, 2) + "\n");
  if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true });

  let bytes = (await fs.stat(path.join(tempDir, "index.json"))).size;
  for (const key of sortedKeys) bytes += (await fs.stat(path.join(tilesDir, `${key}.json`))).size;
  console.log(`wrote ${sortedKeys.length} tiles + index.json (${(bytes / 1e6).toFixed(1)} MB total, ${stations.length} stations) to ${tempDir}`);
}

main().catch((err) => { console.error(`fetch-ncei-temp-tiles: ${err.stack || err.message}`); process.exit(1); });
