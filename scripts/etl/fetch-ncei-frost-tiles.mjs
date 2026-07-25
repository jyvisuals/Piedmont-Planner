#!/usr/bin/env node
// ETL: NCEI 1991-2020 U.S. Climate Normals -> geographic frost tiles.
// =====================================================================
// Downloads NOAA's single archive tarball of per-station annual/seasonal
// normals CSVs, extracts every station's freeze-date probability table, and
// emits 5°x5° tile shards under app/data/frost/tiles/ plus an index at
// app/data/frost/index.json that a browser can lazy-load per tile.
//
// NOT run in CI — this is a manual, rare regeneration step (like icon
// generation). The offline companion scripts/etl/verify-frost-tiles.mjs IS
// CI-safe and checks the emitted files without any network.
//
// Node built-ins only (fetch/zlib/crypto/fs). No npm dependencies.
//
// Usage:
//   node scripts/etl/fetch-ncei-frost-tiles.mjs               # download + build
//   node scripts/etl/fetch-ncei-frost-tiles.mjs --tarball P   # reuse local tarball
//                                                             # (still verified,
//                                                             #  never deleted)
//
// Honesty rules (docs/architecture-decisions.md D8):
// - Every emitted value is parsed from the fetched NCEI CSVs; nothing is
//   estimated, interpolated, or invented.
// - Missing / sentinel values (blank, " -9999.0", any non-MM/DD text) are
//   OMITTED, never filled in.
// - The tarball is verified against a pinned size + md5 before parsing.

import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGunzip } from "node:zlib";

// --------------------------------------------------------------------------
// Pinned source (verify before trusting a byte of it)
// --------------------------------------------------------------------------

const TARBALL_URL =
  "https://noaa-normals-pds.s3.amazonaws.com/normals-annualseasonal/1991-2020/archive/" +
  "us-climate-normals_1991-2020_v1.0.1_annualseasonal_multivariate_by-station_c20230404.tar.gz";
const EXPECTED_BYTES = 54176270;
const EXPECTED_MD5 = "3e460d226747a832d8962d05efadabe5";

// Canonical (non-mirror) URL pattern for per-station provenance, documented in
// the emitted index README. The tarball is NOAA's own Open Data Dissemination
// mirror of the same files (https://registry.opendata.aws/noaa-climate-normals/).
const CANONICAL_ACCESS_URL =
  "https://www.ncei.noaa.gov/data/normals-annualseasonal/1991-2020/access/<STATION_ID>.csv";

// --------------------------------------------------------------------------
// Domain constants
// --------------------------------------------------------------------------

const THRESHOLDS_F = [36, 32, 28, 24, 20, 16];
const PROBABILITIES_PCT = [90, 80, 70, 60, 50, 40, 30, 20, 10];
const REFERENCE_KEY = "32/50"; // the app's frost anchor (schema DEFAULT_FROST_REF)
const TILE_SIZE_DEG = 5;

// GHCN station ids start with a FIPS 10-4 country code. Keep U.S. states plus
// U.S. territories / minor outlying islands; drop foreign stations the archive
// carries (CA Canada) and the freely-associated states that are not U.S.
// territories (FM Micronesia, PS Palau, RM Marshall Islands).
const US_PREFIXES = new Set([
  "US", // 50 states + DC
  "AQ", // American Samoa
  "CQ", // Northern Mariana Islands
  "GQ", // Guam
  "JQ", // Johnston Atoll
  "MQ", // Midway Islands
  "RQ", // Puerto Rico
  "VQ", // U.S. Virgin Islands
  "WQ", // Wake Island
  "FQ", // Baker Island
  "HQ", // Howland Island
  "DQ", // Jarvis Island
  "LQ", // Palmyra Atoll
  "BQ", // Navassa Island
  "KQ", // Kingman Reef
]);

// Non-leap calendar (matches calendarDayOfYear in the schema engine).
const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTH_OFFSETS = MONTH_LENGTHS.reduce(
  (acc, len) => (acc.push(acc[acc.length - 1] + len), acc),
  [0]
);

/** " 03/31" -> 90 (day-of-year, non-leap). null for anything else (sentinels). */
function mmddToDayOfYear(raw) {
  const m = /^(\d{2})\/(\d{2})$/.exec(String(raw).trim());
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > MONTH_LENGTHS[month - 1]) return null;
  return MONTH_OFFSETS[month - 1] + day;
}

// --------------------------------------------------------------------------
// CSV (RFC-4180-ish: quoted fields, doubled quotes)
// --------------------------------------------------------------------------

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = false;
      } else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

// --------------------------------------------------------------------------
// Streaming tar reader (ustar/pax) over a gunzip stream — no disk extraction
// --------------------------------------------------------------------------

const BLOCK = 512;

function parseOctal(buf, start, len) {
  const s = buf.toString("ascii", start, start + len).replace(/\0.*$/, "").trim();
  return s ? parseInt(s, 8) : 0;
}

/**
 * Iterate `{ name, body }` for every regular file in a tar byte stream.
 * Handles ustar name+prefix and GNU/pax long-name extensions; skips
 * directories and metadata entries.
 */
async function* tarEntries(stream) {
  let pending = [];
  let pendingLen = 0;
  let need = BLOCK;
  let state = "header"; // "header" | "body" | "done"
  let current = null; // { name, size, keep }
  let longName = null;

  const take = (n) => {
    const buf = pendingLen === pending[0]?.length && pending.length === 1
      ? pending[0]
      : Buffer.concat(pending, pendingLen);
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
        if (header.every((b) => b === 0)) {
          state = "done"; // end-of-archive marker
          break;
        }
        const typeflag = String.fromCharCode(header[156] || 0x30);
        const size = parseOctal(header, 124, 12);
        let name = header.toString("utf8", 0, 100).replace(/\0.*$/, "");
        const prefix = header.toString("utf8", 345, 500).replace(/\0.*$/, "");
        if (prefix) name = `${prefix}/${name}`;
        if (longName !== null) {
          name = longName;
          longName = null;
        }
        const padded = Math.ceil(size / BLOCK) * BLOCK;
        if (typeflag === "L") {
          // GNU long name: body is the real name of the NEXT entry
          current = { kind: "longname", size, padded };
        } else if (typeflag === "0" || typeflag === "\0") {
          current = { kind: "file", name, size, padded };
        } else {
          current = { kind: "skip", size, padded }; // dirs, pax headers, ...
        }
        state = "body";
        need = current.padded;
        if (need === 0) {
          if (current.kind === "file") yield { name: current.name, body: Buffer.alloc(0) };
          state = "header";
          need = BLOCK;
        }
      } else if (state === "body") {
        const raw = take(current.padded);
        const body = raw.subarray(0, current.size);
        if (current.kind === "file") yield { name: current.name, body };
        else if (current.kind === "longname")
          longName = body.toString("utf8").replace(/\0.*$/, "");
        state = "header";
        need = BLOCK;
      }
    }
    if (state === "done") break;
  }
}

// --------------------------------------------------------------------------
// Download + verify
// --------------------------------------------------------------------------

async function downloadTo(filePath, url) {
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`download failed: HTTP ${res.status} for ${url}`);
  }
  const out = createWriteStream(filePath);
  const { Readable } = await import("node:stream");
  const { pipeline } = await import("node:stream/promises");
  await pipeline(Readable.fromWeb(res.body), out);
}

async function verifyTarball(filePath) {
  const stat = await fs.stat(filePath);
  if (stat.size !== EXPECTED_BYTES) {
    throw new Error(
      `tarball size mismatch: got ${stat.size}, expected ${EXPECTED_BYTES} — refusing to parse`
    );
  }
  const hash = createHash("md5");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  const md5 = hash.digest("hex");
  if (md5 !== EXPECTED_MD5) {
    throw new Error(
      `tarball md5 mismatch: got ${md5}, expected ${EXPECTED_MD5} — refusing to parse`
    );
  }
  return { size: stat.size, md5 };
}

// --------------------------------------------------------------------------
// Station extraction
// --------------------------------------------------------------------------

/** Parse one per-station CSV -> FrostStationRecord-shaped object, or null. */
function stationFromCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) return null;
  const header = parseCsvLine(lines[0]);
  const row = parseCsvLine(lines[1]); // one data row per station in this product
  const col = new Map(header.map((name, i) => [name, i]));
  const get = (name) => {
    const i = col.get(name);
    return i === undefined ? undefined : row[i];
  };

  const id = (get("STATION") ?? "").trim();
  const name = (get("NAME") ?? "").trim();
  const lat = Number.parseFloat(get("LATITUDE"));
  const lng = Number.parseFloat(get("LONGITUDE"));
  if (!id || !name || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (!US_PREFIXES.has(id.slice(0, 2))) return null;

  const lastFrost = {};
  const firstFrost = {};
  for (const t of THRESHOLDS_F) {
    for (const p of PROBABILITIES_PCT) {
      const key = `${t}/${p}`;
      const last = mmddToDayOfYear(get(`ANN-TMIN-PRBLST-T${t}FP${p}`) ?? "");
      const first = mmddToDayOfYear(get(`ANN-TMIN-PRBFST-T${t}FP${p}`) ?? "");
      if (last !== null) lastFrost[key] = last;
      if (first !== null) firstFrost[key] = first;
    }
  }

  // Inclusion rule: the app anchors on 32°F/50% both ways; a station missing
  // either is unusable as a nearest-station answer and is dropped whole.
  if (lastFrost[REFERENCE_KEY] === undefined || firstFrost[REFERENCE_KEY] === undefined) {
    return null;
  }
  return { id, name, lat, lng, lastFrost, firstFrost };
}

function tileKey(lat, lng) {
  const la = Math.floor(lat / TILE_SIZE_DEG) * TILE_SIZE_DEG;
  const lo = Math.floor(lng / TILE_SIZE_DEG) * TILE_SIZE_DEG;
  return `t${la}_${lo}`;
}

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  let tarballArg = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--tarball") tarballArg = args[++i];
    else throw new Error(`unknown argument: ${args[i]}`);
  }

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(scriptDir, "..", "..");
  const frostDir = path.join(repoRoot, "app", "data", "frost");
  const tilesDir = path.join(frostDir, "tiles");

  let tarballPath = tarballArg ? path.resolve(tarballArg) : null;
  let tmpDir = null;
  if (!tarballPath) {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ncei-frost-"));
    tarballPath = path.join(tmpDir, "ncei-annualseasonal.tar.gz");
    console.log(`downloading ${TARBALL_URL}`);
    await downloadTo(tarballPath, TARBALL_URL);
  }

  console.log(`verifying ${tarballPath}`);
  const { size, md5 } = await verifyTarball(tarballPath);
  console.log(`ok: ${size} bytes, md5 ${md5}`);

  const stations = [];
  let csvSeen = 0;
  let skippedForeign = 0;
  let skippedNoAnchor = 0;
  const gunzip = createReadStream(tarballPath).pipe(createGunzip());
  for await (const { name, body } of tarEntries(gunzip)) {
    if (!name.toLowerCase().endsWith(".csv")) continue;
    csvSeen++;
    const text = body.toString("utf8");
    const station = stationFromCsv(text);
    if (station) {
      stations.push(station);
    } else {
      const idGuess = path.basename(name).slice(0, 2);
      if (!US_PREFIXES.has(idGuess)) skippedForeign++;
      else skippedNoAnchor++;
    }
    if (csvSeen % 2000 === 0) console.log(`  ...${csvSeen} CSVs scanned`);
  }
  console.log(
    `scanned ${csvSeen} station CSVs: kept ${stations.length}, ` +
      `skipped ${skippedNoAnchor} without both ${REFERENCE_KEY} anchors, ` +
      `${skippedForeign} non-US`
  );
  if (stations.length === 0) throw new Error("no qualifying stations — aborting");

  // Bucket into tiles, stable-sorted by station id.
  const tiles = new Map();
  for (const s of stations) {
    const key = tileKey(s.lat, s.lng);
    if (!tiles.has(key)) tiles.set(key, []);
    tiles.get(key).push(s);
  }
  for (const list of tiles.values()) list.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const sortedKeys = [...tiles.keys()].sort();

  // Write tiles fresh (remove any stale shard set first).
  await fs.rm(tilesDir, { recursive: true, force: true });
  await fs.mkdir(tilesDir, { recursive: true });
  for (const key of sortedKeys) {
    const shard = { stations: tiles.get(key) };
    await fs.writeFile(path.join(tilesDir, `${key}.json`), JSON.stringify(shard));
  }

  const fetchedAt = new Date().toISOString().slice(0, 10);
  const index = {
    README:
      "NCEI U.S. Climate Normals 1991-2020 annual/seasonal freeze-date probabilities, full-coverage tile shards. " +
      `Source: single NOAA Open Data Dissemination archive tarball ${TARBALL_URL} ` +
      `(${EXPECTED_BYTES} bytes, md5 ${EXPECTED_MD5}, fetched ${fetchedAt}); the bucket is NOAA-operated ` +
      "(https://registry.opendata.aws/noaa-climate-normals/) and mirrors the canonical per-station files at " +
      `${CANONICAL_ACCESS_URL}. ` +
      "Column mapping: per-station CSV columns ANN-TMIN-PRBLST-T<T>FP<P> (last spring occurrence of a minimum <= T degF at exceedance probability P%) " +
      "and ANN-TMIN-PRBFST-T<T>FP<P> (first fall occurrence), T in {36,32,28,24,20,16}, P in {10..90 by 10}; station id/name/lat/lng come verbatim from " +
      "the STATION/NAME/LATITUDE/LONGITUDE columns of the same CSV. Values are whitespace-padded 'MM/DD' strings converted to day-of-year 1..365 on a " +
      "non-leap calendar (month lengths 31,28,31,30,31,30,31,31,30,31,30,31), keyed by FrostKey '<thresholdF>/<probabilityPct>'. Missing values and " +
      "negative sentinels (e.g. ' -9999.0') are OMITTED, never estimated. Inclusion rule: a station is included only if it has BOTH lastFrost['32/50'] " +
      "and firstFrost['32/50'] (the app's reference anchor); all other keys the station publishes are kept. Coverage: all U.S. states + territories in " +
      "the archive (GHCN id country prefixes US/AQ/CQ/GQ/JQ/MQ/RQ/VQ/WQ); foreign stations (Canada) and non-territory freely-associated states " +
      "(FM/PS/RM) are excluded. Tiles are 5-degree squares keyed t<floor(lat/5)*5>_<floor(lng/5)*5>. " +
      "Regenerate with scripts/etl/fetch-ncei-frost-tiles.mjs; verify offline with scripts/etl/verify-frost-tiles.mjs.",
    datasetVersions: { ncei: "1991-2020" },
    tileSizeDeg: TILE_SIZE_DEG,
    tiles: Object.fromEntries(sortedKeys.map((k) => [k, tiles.get(k).length])),
    stationCount: stations.length,
  };
  await fs.writeFile(path.join(frostDir, "index.json"), JSON.stringify(index, null, 2) + "\n");

  // Cleanup: delete only what this run created (never a caller-supplied tarball).
  if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true });

  let bytes = 0;
  for (const key of sortedKeys) bytes += (await fs.stat(path.join(tilesDir, `${key}.json`))).size;
  bytes += (await fs.stat(path.join(frostDir, "index.json"))).size;
  console.log(
    `wrote ${sortedKeys.length} tiles + index.json (${bytes} bytes total, ${stations.length} stations) to ${frostDir}`
  );
}

main().catch((err) => {
  console.error(`fetch-ncei-frost-tiles: ${err.message}`);
  process.exit(1);
});
