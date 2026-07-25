// A site's annual temperature climatology as a 24 half-month distribution of
// daily min/max °F — the input the suitability engine (suitability.ts) scores
// against. Two builders produce the SAME shape:
//
//   realSiteClimate()  — from real NCEI 1991-2020 DAILY temperature normals
//                        (schema/providers/data/temp-normals.json), compacted to
//                        24 slots by the ETL. This is Step 2 of
//                        docs/climate-suitability-model.md: real min AND max, so
//                        the HEAT wall is modeled, not just the frost wall.
//                        heatModeled = true. Frost-free deserts are handled, not
//                        refused — their timing comes from the heat ceiling.
//
//   modelSiteClimate() — the frost-only fallback for sites with no temperature
//                        tile: reconstructs the daily-MIN curve from the real
//                        multi-threshold frost crossings (a sinusoid fit; RMSE
//                        <1°F through the crossings) and estimates max as min +
//                        a fixed diurnal range. heatModeled = false, and it
//                        REFUSES frost-free sites (no cold crossings to fit) —
//                        the honest boundary that the real path removes.
//
// Both feed the same samplers minTempF/maxTempF/meanTempF, which linearly
// interpolate the 24-slot table across the year. Pure and serializable.

import type { FrostThresholdF, SiteContext } from "../types.ts";

const THRESHOLDS: readonly FrostThresholdF[] = [36, 32, 28, 24, 20, 16];

/**
 * Diurnal range (daily max − daily min), °F, used only by the frost-only
 * fallback to estimate a max curve it has no data for. A documented constant;
 * the real path carries the actual max.
 */
export const DIURNAL_RANGE_F = 22;

const HARD_FREEZE_F = 32;

/** Raised when frost crossings cannot support the frost-only fit (see below). */
export class ClimateModelError extends Error {}

export interface SiteClimate {
  /** 24 half-month slots (index 0 = Jan h1 … 23 = Dec h2), daily-mean min °F. */
  tminF: number[];
  /** 24 slots, daily-mean max °F. */
  tmaxF: number[];
  /** 24 slots, interannual spread (stddev) of daily min / max °F. */
  tminSpreadF: number[];
  tmaxSpreadF: number[];
  /** Spring/fall day-of-year the daily-min crosses 32°F (frost-free ⇒ NaN). */
  lastFrostDay: number;
  firstFrostDay: number;
  /** True when a real daily-max curve backs the heat wall (real path only). */
  heatModeled: boolean;
  source: "ncei-daily-normals" | "frost-derived";
  /** Frost-only fit quality (RMSE °F through the crossings); 0 for real data. */
  rmseF: number;
  /** Frost crossing points fed to the fit; slot count (24) for real data. */
  points: number;
}

// --- calendar geometry: 24 half-month slot midpoints (day-of-year) -----------
const MONTH_LEN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const SLOT_MID: readonly number[] = (() => {
  const mids: number[] = [];
  let day = 1;
  for (const len of MONTH_LEN) {
    mids.push(day + 7); // h1: days 1..15, midpoint ~ day+7
    mids.push(day + 15 + Math.floor((len - 15) / 2)); // h2 midpoint
    day += len;
  }
  return mids;
})();
const YEAR = 365;

/** Normalize any day into 1..365. */
function wrapDay(day: number): number {
  return ((Math.round(day) - 1) % YEAR + YEAR) % YEAR + 1;
}

/**
 * Linearly interpolate a 24-slot array at day-of-year `day`, treating the slot
 * midpoints as sample points on a circular year.
 */
function sampleSlots(arr: number[], day: number): number {
  const d = wrapDay(day);
  // Find the slot whose midpoint is at/just below d (circularly).
  let lo = 23;
  for (let i = 0; i < 24; i++) {
    if (SLOT_MID[i]! <= d) lo = i;
  }
  // If d is before the first midpoint, the lower neighbor wraps to slot 23.
  if (d < SLOT_MID[0]!) lo = 23;
  const hi = (lo + 1) % 24;
  const loDay = SLOT_MID[lo]!;
  let hiDay = SLOT_MID[hi]!;
  let dd = d;
  if (hiDay <= loDay) hiDay += YEAR; // wrap
  if (dd < loDay) dd += YEAR;
  const t = hiDay === loDay ? 0 : (dd - loDay) / (hiDay - loDay);
  const a = arr[lo]!;
  const b = arr[hi]!;
  return a + (b - a) * t;
}

/** Daily-min temperature (°F) on day-of-year `day` (wraps). */
export function minTempF(c: SiteClimate, day: number): number {
  return sampleSlots(c.tminF, day);
}
/** Daily-max temperature (°F) on day-of-year `day` (wraps). */
export function maxTempF(c: SiteClimate, day: number): number {
  return sampleSlots(c.tmaxF, day);
}
/** Daily-mean temperature (°F) on day-of-year `day` (wraps). */
export function meanTempF(c: SiteClimate, day: number): number {
  return (minTempF(c, day) + maxTempF(c, day)) / 2;
}

/** Interannual spread (stddev, °F) of the daily min on day-of-year `day`. */
export function minSpreadF(c: SiteClimate, day: number): number {
  return sampleSlots(c.tminSpreadF, day);
}
/** Interannual spread (stddev, °F) of the daily max on day-of-year `day`. */
export function maxSpreadF(c: SiteClimate, day: number): number {
  return sampleSlots(c.tmaxSpreadF, day);
}
/**
 * Spread (stddev, °F) of the daily MEAN. tmin and tmax co-vary, so their sum's
 * variance is between max(var) (perfect correlation) and the independent sum;
 * pooling as sqrt((s_min²+s_max²))/2 is the standard independent approximation
 * and is honest enough for a placement model (documented in the design doc).
 */
export function meanSpreadF(c: SiteClimate, day: number): number {
  const a = minSpreadF(c, day);
  const b = maxSpreadF(c, day);
  return Math.sqrt(a * a + b * b) / 2;
}

/** First day-of-year the interpolated daily-min crosses 32°F in a direction. */
function freezeCrossing(tminF: number[], direction: "spring" | "fall"): number {
  for (let d = 2; d <= YEAR; d++) {
    const prev = sampleSlots(tminF, d - 1);
    const cur = sampleSlots(tminF, d);
    if (direction === "spring" && prev < HARD_FREEZE_F && cur >= HARD_FREEZE_F) return d;
    if (direction === "fall" && prev >= HARD_FREEZE_F && cur < HARD_FREEZE_F) return d;
  }
  return NaN; // frost-free: never crosses
}

// ---------------------------------------------------------------------------
// Real path: NCEI daily temperature normals (heat wall modeled)
// ---------------------------------------------------------------------------

/** One station record from temp-normals.json (24-slot arrays, may hold nulls). */
export interface StationTempNormals {
  id: string;
  tminF: Array<number | null>;
  tmaxF: Array<number | null>;
  tminSdF: Array<number | null>;
  tmaxSdF: Array<number | null>;
}

/** Fill any null slot by carrying the nearest non-null neighbor (circular). */
function fillNulls(arr: Array<number | null>): number[] {
  const out = arr.slice();
  if (out.every((v) => v === null)) throw new ClimateModelError("temp normals: all slots null");
  for (let i = 0; i < out.length; i++) {
    if (out[i] === null) {
      for (let step = 1; step < 24; step++) {
        const a = out[(i - step + 24) % 24];
        const b = out[(i + step) % 24];
        if (a !== null && a !== undefined) { out[i] = a; break; }
        if (b !== null && b !== undefined) { out[i] = b; break; }
      }
    }
  }
  return out as number[];
}

/** Build a SiteClimate from real NCEI daily-normals slots. Heat wall modeled. */
export function realSiteClimate(st: StationTempNormals): SiteClimate {
  const tminF = fillNulls(st.tminF);
  const tmaxF = fillNulls(st.tmaxF);
  const tminSpreadF = fillNulls(st.tminSdF.map((v) => (v === null ? 0 : v)));
  const tmaxSpreadF = fillNulls(st.tmaxSdF.map((v) => (v === null ? 0 : v)));
  return {
    tminF,
    tmaxF,
    tminSpreadF,
    tmaxSpreadF,
    lastFrostDay: freezeCrossing(tminF, "spring"),
    firstFrostDay: freezeCrossing(tminF, "fall"),
    heatModeled: true,
    source: "ncei-daily-normals",
    rmseF: 0,
    points: 24,
  };
}

// ---------------------------------------------------------------------------
// Fallback path: frost-derived sinusoid (frost wall only; refuses frost-free)
// ---------------------------------------------------------------------------

interface FitPoint {
  day: number;
  tempF: number;
}
function frostPoints(site: SiteContext): FitPoint[] {
  const pts: FitPoint[] = [];
  for (const t of THRESHOLDS) {
    const key = `${t}/50` as const;
    const spring = site.frost.lastFrost[key];
    const fall = site.frost.firstFrost[key];
    if (spring !== undefined) pts.push({ day: spring, tempF: t });
    if (fall !== undefined) pts.push({ day: fall, tempF: t });
  }
  return pts;
}

/**
 * Build a SiteClimate from the frost table alone: fit min(day) = M − A·cos(2π
 * (day−p)/365) to the real threshold crossings, then sample it into 24 slots
 * (max = min + a fixed diurnal range). Refuses frost-free / near-frost-free
 * sites — with no cold crossings the fit blows up, and the heat wall those
 * sites are timed around needs the real max data this path does not carry.
 */
export function modelSiteClimate(site: SiteContext): SiteClimate {
  const pts = frostPoints(site);
  if (pts.length < 3) {
    throw new ClimateModelError(
      `modelSiteClimate: only ${pts.length} frost point(s) at station ` +
        `${site.frost.station.id} — need ≥3 threshold crossings to fit the curve`
    );
  }

  let best: { p: number; M: number; A: number; sse: number } | null = null;
  for (let p = -60; p <= 90; p++) {
    let n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (const { day, tempF } of pts) {
      const x = -Math.cos((2 * Math.PI * (day - p)) / YEAR);
      n += 1; sx += x; sy += tempF; sxx += x * x; sxy += x * tempF;
    }
    const denom = n * sxx - sx * sx;
    if (Math.abs(denom) < 1e-9) continue;
    const A = (n * sxy - sx * sy) / denom;
    const M = (sy - A * sx) / n;
    let sse = 0;
    for (const { day, tempF } of pts) {
      const x = -Math.cos((2 * Math.PI * (day - p)) / YEAR);
      sse += (M + A * x - tempF) ** 2;
    }
    if (!best || sse < best.sse) best = { p, M, A, sse };
  }
  if (!best) throw new ClimateModelError("modelSiteClimate: degenerate fit");

  const amplF = Math.abs(best.A);
  const rmseF = Math.sqrt(best.sse / pts.length);
  const last = site.frost.lastFrost["32/50"];
  const first = site.frost.firstFrost["32/50"];
  const frostFreeSpan = last !== undefined && first !== undefined ? first - last : NaN;
  if (
    pts.length < 4 ||
    amplF > 55 ||
    best.M < -20 ||
    best.M > 80 ||
    rmseF > 6 ||
    !(frostFreeSpan > 0 && frostFreeSpan < 330)
  ) {
    throw new ClimateModelError(
      `modelSiteClimate: no annual-temperature fit at station ${site.frost.station.id} ` +
        `(points=${pts.length}, ampl=${amplF.toFixed(0)}°F, mean-min=${best.M.toFixed(0)}°F, ` +
        `rmse=${rmseF.toFixed(1)}°F, frost-free span=${Number.isFinite(frostFreeSpan) ? frostFreeSpan : "n/a"}d) ` +
        `— frost-free/near-frost-free sites need real max-temperature data`
    );
  }

  const coldestDay = ((Math.round(best.p) - 1) % YEAR + YEAR) % YEAR + 1;
  const minAt = (day: number) => best!.M - amplF * Math.cos((2 * Math.PI * (day - coldestDay)) / YEAR);
  const tminF = SLOT_MID.map((d) => Math.round(minAt(d) * 10) / 10);
  const tmaxF = tminF.map((v) => v + DIURNAL_RANGE_F);
  return {
    tminF,
    tmaxF,
    tminSpreadF: new Array(24).fill(0),
    tmaxSpreadF: new Array(24).fill(0),
    lastFrostDay: last as number,
    firstFrostDay: first as number,
    heatModeled: false,
    source: "frost-derived",
    rmseF,
    points: pts.length,
  };
}
