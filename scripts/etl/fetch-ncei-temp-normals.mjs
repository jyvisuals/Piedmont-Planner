#!/usr/bin/env node
// ETL: NCEI 1991-2020 Daily Temperature Normals -> biweekly climate tiles.
// =====================================================================
// For each seed station in schema/providers/data/frost-stations.json, downloads
// NOAA's per-station DAILY normals CSV (DLY-TMAX/TMIN-NORMAL + their STDDEVs for
// all 365 days) and COMPACTS it to the 24 half-month slots the render grid uses.
// This is the real Step 2 of docs/climate-suitability-model.md: the biweekly
// min/max temperature distribution the suitability engine needs to model the
// HEAT wall, not just the frost wall. Emits schema/providers/data/temp-normals.json.
//
// The compaction insight from the design doc: you do NOT ship raw daily series.
// Per station we ship, per half-month slot, the mean daily max, mean daily min,
// and the mean interannual spread (stddev) of each — ~24 x 4 numbers, the same
// order as the frost tiles, enough to integrate any stage window over.
//
// NOT run in CI — manual, rare regeneration (like the frost ETL and icon gen).
// The offline companion scripts/etl/verify-temp-normals.mjs IS CI-safe.
//
// Node built-ins only. Usage:
//   node scripts/etl/fetch-ncei-temp-normals.mjs
//   node scripts/etl/fetch-ncei-temp-normals.mjs --cache DIR   # reuse/keep CSVs
//
// Honesty rules (D8): every value is parsed from the fetched NCEI CSVs; nothing
// is estimated or invented. Sentinels (-9999, blank, non-numeric) are OMITTED,
// and a slot with no valid day is emitted as null, never filled.

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const SEED = path.join(rootDir, "schema/providers/data/frost-stations.json");
const OUT = path.join(rootDir, "schema/providers/data/temp-normals.json");

const ACCESS_BASE = "https://noaa-normals-pds.s3.amazonaws.com/normals-daily/1991-2020/access";
const CANONICAL_BASE = "https://www.ncei.noaa.gov/data/normals-daily/1991-2020/access";

// --- calendar geometry: 24 half-month slots (non-leap), mirroring resolve.ts --
const MONTH_LEN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const SLOT_OF_DOY = (() => {
  // day-of-year (1..365) -> slot index 0..23
  const map = new Array(366);
  let day = 1;
  MONTH_LEN.forEach((len, m) => {
    for (let d = 1; d <= len; d++) {
      const slot = m * 2 + (d <= 15 ? 0 : 1);
      map[day] = slot;
      day += 1;
    }
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
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else quoted = false;
      } else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

/** Parse a value; null for NCEI sentinels/blanks/non-numeric. */
function num(raw) {
  if (raw === undefined) return null;
  const s = raw.trim();
  if (!s || s === "-9999" || s === "-9999.0") return null;
  const v = Number(s);
  if (!Number.isFinite(v) || v <= -900) return null;
  return v;
}

const round1 = (v) => Math.round(v * 10) / 10;

/** Compact one station's daily-normals CSV into 24 half-month slot stats. */
function compact(csv) {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const H = parseCsvLine(lines[0]);
  const idx = (name) => H.indexOf(name);
  const ci = {
    month: idx("month"), day: idx("day"), elev: idx("ELEVATION"),
    tmax: idx("DLY-TMAX-NORMAL"), tmin: idx("DLY-TMIN-NORMAL"),
    tmaxSd: idx("DLY-TMAX-STDDEV"), tminSd: idx("DLY-TMIN-STDDEV"),
  };
  for (const [k, v] of Object.entries(ci)) if (k !== "elev" && v < 0) throw new Error(`missing column for ${k}`);
  const elevRaw = ci.elev >= 0 ? num(parseCsvLine(lines[1])[ci.elev]) : null;
  const elevM = elevRaw === null ? null : Math.round(elevRaw);

  // Accumulate per slot.
  const acc = Array.from({ length: 24 }, () => ({ tmax: [], tmin: [], tmaxSd: [], tminSd: [] }));
  for (let r = 1; r < lines.length; r++) {
    const f = parseCsvLine(lines[r]);
    const month = Number(f[ci.month]);
    const dayOfMonth = Number(f[ci.day]);
    // Skip sentinel dates (month 99) and the leap day (Feb 29 — non-leap grid).
    if (!(month >= 1 && month <= 12) || !(dayOfMonth >= 1 && dayOfMonth <= MONTH_LEN[month - 1])) continue;
    const slot = SLOT_OF_DOY[doy(month, dayOfMonth)];
    const a = acc[slot];
    const tmax = num(f[ci.tmax]), tmin = num(f[ci.tmin]);
    const tmaxSd = num(f[ci.tmaxSd]), tminSd = num(f[ci.tminSd]);
    if (tmax !== null) a.tmax.push(tmax);
    if (tmin !== null) a.tmin.push(tmin);
    if (tmaxSd !== null) a.tmaxSd.push(tmaxSd);
    if (tminSd !== null) a.tminSd.push(tminSd);
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
  return { elevM, tmaxF, tminF, tmaxSdF, tminSdF };
}

async function fetchText(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.text();
      if (res.status === 404) throw new Error(`404 ${url}`);
    } catch (e) {
      if (attempt === 3) throw e;
    }
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
  }
  throw new Error(`failed ${url}`);
}

async function main() {
  const cacheArg = process.argv.indexOf("--cache");
  const cacheDir = cacheArg >= 0 ? process.argv[cacheArg + 1] : null;
  if (cacheDir) await fs.mkdir(cacheDir, { recursive: true });

  const seed = JSON.parse(await fs.readFile(SEED, "utf8"));
  const fetchedAt = new Date().toISOString().slice(0, 10);
  const stations = [];

  for (const st of seed.stations) {
    const url = `${ACCESS_BASE}/${st.id}.csv`;
    let csv;
    const cachePath = cacheDir ? path.join(cacheDir, `${st.id}.csv`) : null;
    if (cachePath) {
      try { csv = await fs.readFile(cachePath, "utf8"); } catch { /* fetch below */ }
    }
    if (!csv) {
      process.stderr.write(`fetching ${st.id} ${st.name.trim()} ...\n`);
      csv = await fetchText(url);
      if (cachePath) await fs.writeFile(cachePath, csv);
    }
    const md5 = createHash("md5").update(csv).digest("hex");
    const slots = compact(csv);
    stations.push({
      id: st.id,
      name: st.name,
      lat: st.lat,
      lng: st.lng,
      sourceUrl: `${CANONICAL_BASE}/${st.id}.csv`,
      fetchedFrom: url,
      fetchedAt,
      sourceMd5: md5,
      ...slots,
    });
  }

  const out = {
    dataset: "NCEI U.S. Climate Normals 1991-2020 (daily temperature normals)",
    product: "normals-daily",
    variable: "DLY-TMAX-NORMAL / DLY-TMIN-NORMAL (+ STDDEV), compacted to 24 half-month slots (°F)",
    slotLabels: (() => {
      const M = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
      return M.flatMap((m) => [`${m} h1`, `${m} h2`]);
    })(),
    stationCount: stations.length,
    stations,
  };
  await fs.writeFile(OUT, JSON.stringify(out, null, 0) + "\n");
  process.stderr.write(`wrote ${OUT} (${stations.length} stations)\n`);
}

main().catch((e) => { process.stderr.write(String(e?.stack || e) + "\n"); process.exit(1); });
