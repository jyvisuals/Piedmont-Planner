#!/usr/bin/env node
// fetch-zip-zones.mjs — ETL: full national ZIP -> (lat, lng, USDA zone) dataset.
// =============================================================================
// Fetches the official PRISM 2023 Plant Hardiness Zone ZIP-code table and the
// US Census 2020 ZCTA gazetteer (internal-point centroids), joins them on
// ZIP/ZCTA code, and emits browser-lazy-loadable shards:
//
//   app/data/zip/{PP}.json          — per 2-digit ZIP prefix: { "27510": [lat, lng, "8a"], ... }
//   app/data/zip/index.json         — provenance README + per-prefix counts
//   app/data/zones/tiles/t{LAT}_{LNG}.json — 5°x5° tiles: { "points": [[lat, lng, "8a"], ...] }
//   app/data/zones/index.json       — provenance README + per-tile counts
//
// Tuple order everywhere: [lat, lng, zone].
//
// NETWORK: this script fetches from the pinned GitHub mirrors documented in
// schema/providers/data/zone-points.json (direct prism.oregonstate.edu egress
// is blocked in some build environments; the mirrors were confirmed
// byte-identical to each other, and the PRISM file's md5 is pinned below).
// It is NOT run in CI — CI runs the offline scripts/etl/verify-zip-zones.mjs.
//
// Re-run:      node scripts/etl/fetch-zip-zones.mjs
// Local files: node scripts/etl/fetch-zip-zones.mjs --phzm <path> --gaz <path>
//              (use pre-downloaded copies; md5s are still verified)
//
// Honesty rules (docs/architecture-decisions.md D8): every value is copied
// verbatim from the sources; rows present in only one dataset are DROPPED and
// counted, never given invented coordinates or zones. md5 mismatch is fatal.

import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

// ---------------------------------------------------------------------------
// Sources (canonical URLs + pinned byte-identical mirrors + pinned md5s)
// ---------------------------------------------------------------------------

const PHZM_CANONICAL =
  "https://prism.oregonstate.edu/projects/phm_data/phzm_us_zipcode_2023.csv";
const PHZM_MIRRORS = [
  "https://raw.githubusercontent.com/tamu-capstone-gardener/rails-react/32893b3d/app/assets/csv/phzm_us_zipcode_2023.csv",
  "https://raw.githubusercontent.com/BalancedProtector/GardenBoxPrototype/082d7d76/data/phzm_us_zipcode_2023.csv",
];
// Recorded in schema/providers/data/zone-points.json (both mirrors byte-identical).
const PHZM_MD5 = "5722dd8d764648ce3dacca4828508703";

const GAZ_CANONICAL =
  "https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2020_Gazetteer/2020_Gaz_zcta_national.zip";
const GAZ_MIRRORS = [
  "https://raw.githubusercontent.com/Anervea-AI/ct-access/a2ab11c9/backend/app/data/geo_ref/2020_Gaz_zcta_national.txt",
];
// md5 of the commit-pinned mirror copy above (byte-stable: URL pins a commit).
const GAZ_MD5 = "dc5ffd2fc8a60f9f59e95771f8cc5865";

const ZONE_RE = /^([0-9]|1[0-3])[ab]$/;
const ZIP_RE = /^\d{5}$/;
const TILE_DEG = 5;

// ---------------------------------------------------------------------------
// Fetch helpers (node built-ins only; global fetch)
// ---------------------------------------------------------------------------

function md5(buf) {
  return createHash("md5").update(buf).digest("hex");
}

async function fetchOne(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Fetch from the first mirror that works, or read a local override path. */
async function getSource(label, mirrors, expectedMd5, localPath) {
  let buf;
  let from;
  if (localPath) {
    buf = readFileSync(localPath);
    from = localPath;
  } else {
    let lastErr;
    for (const url of mirrors) {
      try {
        buf = await fetchOne(url);
        from = url;
        break;
      } catch (err) {
        lastErr = err;
        console.warn(`  mirror failed (${url}): ${err.message}`);
      }
    }
    if (!buf) {
      throw new Error(
        `${label}: all mirrors failed (${lastErr?.message}). ` +
          `Download manually and pass --${label} <path>.`
      );
    }
  }
  const got = md5(buf);
  if (got !== expectedMd5) {
    throw new Error(
      `${label}: md5 mismatch for ${from} — got ${got}, expected ${expectedMd5}. ` +
        `Refusing to build from unverified bytes (D8).`
    );
  }
  console.log(`  ${label}: ${buf.length} bytes from ${from} (md5 ${got} OK)`);
  return buf.toString("utf8");
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/** phzm_us_zipcode_2023.csv: zipcode,zone,trange,zonetitle (no quoted commas). */
function parsePhzm(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  const header = lines.shift();
  if (header !== "zipcode,zone,trange,zonetitle") {
    throw new Error(`phzm: unexpected header ${JSON.stringify(header)}`);
  }
  const zones = new Map(); // zip -> zone
  for (const line of lines) {
    const [zip, zone] = line.split(",");
    if (!ZIP_RE.test(zip)) throw new Error(`phzm: bad zipcode ${JSON.stringify(line)}`);
    if (!ZONE_RE.test(zone)) throw new Error(`phzm: bad zone ${JSON.stringify(line)}`);
    const prev = zones.get(zip);
    if (prev !== undefined && prev !== zone) {
      throw new Error(`phzm: conflicting zones for ${zip}: ${prev} vs ${zone}`);
    }
    zones.set(zip, zone);
  }
  return zones;
}

/** 2020_Gaz_zcta_national.txt: tab-separated, GEOID / ... / INTPTLAT / INTPTLONG. */
function parseGaz(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const header = lines.shift().split("\t").map((s) => s.trim());
  const iGeoid = header.indexOf("GEOID");
  const iLat = header.indexOf("INTPTLAT");
  const iLng = header.indexOf("INTPTLONG");
  if (iGeoid < 0 || iLat < 0 || iLng < 0) {
    throw new Error(`gaz: unexpected header ${JSON.stringify(header)}`);
  }
  const coords = new Map(); // zcta -> [lat, lng]
  for (const line of lines) {
    const cols = line.split("\t").map((s) => s.trim());
    const zcta = cols[iGeoid];
    const lat = Number(cols[iLat]);
    const lng = Number(cols[iLng]);
    if (!ZIP_RE.test(zcta)) throw new Error(`gaz: bad GEOID ${JSON.stringify(line)}`);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error(`gaz: bad coordinates ${JSON.stringify(line)}`);
    }
    if (coords.has(zcta)) throw new Error(`gaz: duplicate GEOID ${zcta}`);
    coords.set(zcta, [lat, lng]);
  }
  return coords;
}

// ---------------------------------------------------------------------------
// Tile key: floor to the 5-degree grid. `${-0}` stringifies as "0", so no
// negative-zero tile names are possible.
// ---------------------------------------------------------------------------

function tileKey(lat, lng) {
  const tLat = Math.floor(lat / TILE_DEG) * TILE_DEG;
  const tLng = Math.floor(lng / TILE_DEG) * TILE_DEG;
  return `t${tLat}_${tLng}`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  console.log("fetch-zip-zones: fetching sources...");
  const phzmText = await getSource("phzm", PHZM_MIRRORS, PHZM_MD5, argValue("--phzm"));
  const gazText = await getSource("gaz", GAZ_MIRRORS, GAZ_MD5, argValue("--gaz"));

  const zones = parsePhzm(phzmText); // zip -> zone
  const coords = parseGaz(gazText); // zcta -> [lat, lng]

  // Inner join on ZIP/ZCTA code. Rows on one side only are dropped + counted.
  const joined = []; // [zip, lat, lng, zone]
  let droppedGazOnly = 0;
  for (const [zcta, [lat, lng]] of coords) {
    const zone = zones.get(zcta);
    if (zone === undefined) {
      droppedGazOnly++;
      continue;
    }
    joined.push([zcta, lat, lng, zone]);
  }
  const droppedPhzOnly = zones.size - joined.length;
  joined.sort((a, b) => (a[0] < b[0] ? -1 : 1)); // by ZIP, deterministic

  console.log(
    `  join: ${joined.length} ZIPs (dropped ${droppedPhzOnly} PRISM-only rows, ` +
      `${droppedGazOnly} gazetteer-only ZCTAs)`
  );

  // ---- group ----
  const byPrefix = new Map(); // "27" -> { "27510": [lat, lng, zone], ... }
  const byTile = new Map(); // "t35_-80" -> [[lat, lng, zone], ...]
  for (const [zip, lat, lng, zone] of joined) {
    const pp = zip.slice(0, 2);
    if (!byPrefix.has(pp)) byPrefix.set(pp, {});
    byPrefix.get(pp)[zip] = [lat, lng, zone];
    const tk = tileKey(lat, lng);
    if (!byTile.has(tk)) byTile.set(tk, []);
    byTile.get(tk).push([lat, lng, zone]);
  }
  // Stable, deterministic tile ordering: lat, then lng, then zone.
  for (const pts of byTile.values()) {
    pts.sort((a, b) => a[0] - b[0] || a[1] - b[1] || (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0));
  }

  // ---- write (rerunnable: clear previous shard output first) ----
  const zipDir = join(ROOT, "app", "data", "zip");
  const tileDir = join(ROOT, "app", "data", "zones", "tiles");
  const zonesDir = join(ROOT, "app", "data", "zones");
  for (const dir of [zipDir, tileDir]) {
    mkdirSync(dir, { recursive: true });
    for (const f of readdirSync(dir)) {
      if (f.endsWith(".json")) rmSync(join(dir, f));
    }
  }
  rmSync(join(zonesDir, "index.json"), { force: true });

  const sortedPrefixes = [...byPrefix.keys()].sort();
  const prefixCounts = {};
  for (const pp of sortedPrefixes) {
    const shard = byPrefix.get(pp);
    prefixCounts[pp] = Object.keys(shard).length;
    writeFileSync(join(zipDir, `${pp}.json`), JSON.stringify(shard));
  }

  const sortedTiles = [...byTile.keys()].sort();
  const tileCounts = {};
  for (const tk of sortedTiles) {
    const pts = byTile.get(tk);
    tileCounts[tk] = pts.length;
    writeFileSync(join(tileDir, `${tk}.json`), JSON.stringify({ points: pts }));
  }

  const fetchDate = new Date().toISOString().slice(0, 10);
  const provenance = [
    `USDA zone: PRISM/USDA-ARS 2023 ZIP-code dataset phzm_us_zipcode_2023.csv (schema zipcode,zone,trange,zonetitle; canonical source ${PHZM_CANONICAL}). Direct prism.oregonstate.edu egress is blocked from the build environment, so the file was fetched from a GitHub mirror; the two documented mirrors are byte-identical, md5 ${PHZM_MD5}: ${PHZM_MIRRORS.join(" and ")}.`,
    `Coordinates: US Census Bureau 2020 ZCTA5 Gazetteer internal points (columns GEOID, INTPTLAT, INTPTLONG; canonical source ${GAZ_CANONICAL}, fetched from the commit-pinned verbatim copy ${GAZ_MIRRORS[0]}, md5 ${GAZ_MD5}).`,
    `Fetched ${fetchDate} by scripts/etl/fetch-zip-zones.mjs.`,
    `Join rule: inner join on ZIP/ZCTA code — a ZIP appears here only if it has BOTH a PRISM zone row AND a Census ZCTA centroid; rows present in only one dataset are dropped, never given invented values (D8). This run: ${zones.size} PRISM rows x ${coords.size} gazetteer ZCTAs -> ${joined.length} joined ZIPs; dropped ${droppedPhzOnly} PRISM-only ZIPs (mostly PO-box/unique ZIPs with no ZCTA) and ${droppedGazOnly} gazetteer-only ZCTAs (no PRISM zone row).`,
    `Coverage note: the md5-pinned phzm_us_zipcode_2023.csv mirror file contains CONUS ZIPs only — it has no Alaska (995xx-999xx), Hawaii (967xx-968xx), or Puerto Rico/territory (006xx-009xx, 969xx) rows, so those gazetteer ZCTAs are part of the gazetteer-only drop count above and this dataset covers the contiguous US.`,
  ];

  const zipIndex = {
    README: [
      ...provenance,
      `Files: {PP}.json per 2-digit ZIP prefix, minified { "<5-digit zip>": [lat, lng, zone] }. Tuple order is [lat, lng, zone]: lat/lng are the Census ZCTA internal-point centroid in decimal degrees (verbatim), zone is the 2023 USDA hardiness zone string, e.g. "8a".`,
    ],
    datasetVersions: { phz: "2023", zcta: "2020" },
    prefixes: prefixCounts,
    zipCount: joined.length,
  };
  writeFileSync(join(zipDir, "index.json"), JSON.stringify(zipIndex, null, 2) + "\n");

  const zonesIndex = {
    README: [
      ...provenance,
      `Files: tiles/t{LAT}_{LNG}.json where LAT = floor(lat/${TILE_DEG})*${TILE_DEG} and LNG = floor(lng/${TILE_DEG})*${TILE_DEG} (${TILE_DEG}-degree by ${TILE_DEG}-degree tiles, e.g. t35_-80.json). Each file is { "points": [[lat, lng, zone], ...] } — ZCTA internal-point centroids for nearest-point coordinate -> zone lookup, sorted by lat, then lng, then zone. Tuple order is [lat, lng, zone].`,
    ],
    datasetVersions: { phz: "2023", zcta: "2020" },
    tileSizeDeg: TILE_DEG,
    tiles: tileCounts,
    pointCount: joined.length,
  };
  writeFileSync(join(zonesDir, "index.json"), JSON.stringify(zonesIndex, null, 2) + "\n");

  console.log(
    `  wrote ${sortedPrefixes.length} prefix shards + index to app/data/zip/, ` +
      `${sortedTiles.length} tiles + index to app/data/zones/`
  );
  console.log("fetch-zip-zones: done. Run scripts/etl/verify-zip-zones.mjs to check.");
}

main().catch((err) => {
  console.error(`fetch-zip-zones: FAILED: ${err.message}`);
  process.exit(1);
});
