// A site's annual temperature climatology, MODELED from the real NCEI frost
// crossings (the Step-2 stand-in for the suitability engine,
// docs/climate-suitability-model.md).
//
// The design doc's real Step 2 ships biweekly climate-distribution *tiles*
// (min/max/precip percentiles from NCEI/PRISM). Those aren't fetchable in this
// build environment, but the frost table we already ship is itself real
// distributional data: for each temperature threshold (36/32/28/24/20/16°F) NCEI
// gives the median day the daily-MIN climatology crosses it in spring and again
// in fall. That's up to 12 real (day, temperature) points on the annual daily-min
// curve. Fitting a sinusoid through them reconstructs the curve.
//
// HONESTY (measured, not asserted): the fit nails the COLD wall — RMSE < 1°F
// through the real frost crossings, so frost-survival timing is essentially
// exact. But the points all sit in the 16–36°F cold tail, so the fit
// UNDERESTIMATES absolute summer warmth by several °F and cannot yet represent
// the heat wall. `heatModeled` is therefore false: the suitability scorer treats
// the heat ceiling as approximate until real max-temperature tiles replace this
// module (the clean seam the doc describes). This is exactly the "start
// temperature-dominated, validate, learn cheaply" path.
//
// Pure and serializable: no I/O, no clock. Input is the plain frost table the
// SiteContext already carries.

import type { FrostThresholdF, SiteContext } from "../types.ts";

const THRESHOLDS: readonly FrostThresholdF[] = [36, 32, 28, 24, 20, 16];

/**
 * Raised when the frost crossings cannot support an annual-temperature fit —
 * chiefly frost-free / near-frost-free sites (low desert, tropics), which have
 * no cold-season crossings to anchor the curve. This is the suitability engine's
 * honest boundary, the analog of the offset engine's frost-free refusal: the
 * heat wall those sites are timed around needs real max-temperature data this
 * frost-derived model does not carry (docs/climate-suitability-model.md).
 */
export class ClimateModelError extends Error {}

/**
 * Assumed spring/fall diurnal range (daily max − daily min), °F. A documented
 * constant approximation — real tiles would carry the actual max curve. Used
 * only to derive a daily-max estimate for the heat side of the comfort curve.
 */
export const DIURNAL_RANGE_F = 22;

export interface SiteClimate {
  /** Fitted annual daily-min curve: min(day) = meanF − amplF·cos(2π(day−coldestDay)/365). */
  meanMinF: number;
  amplF: number;
  coldestDay: number;
  /** Real 32°F/50% frost crossings (day-of-year), carried through verbatim. */
  lastFrostDay: number;
  firstFrostDay: number;
  /** Fit quality (RMSE °F through the frost points) and how many points fed it. */
  rmseF: number;
  points: number;
  /**
   * False until real max-temperature data backs the heat wall. The frost-derived
   * fit is cold-accurate but warm-biased low, so heat-ceiling penalties are
   * advisory only while this is false (docs/climate-suitability-model.md).
   */
  heatModeled: boolean;
}

interface FitPoint {
  day: number;
  tempF: number;
}

/** Collect real (day, temperature) points from the 50%-probability crossings. */
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
 * Fit min(day) = M − A·cos(2π(day − p)/365). The phase p (coldest day) is found
 * by a coarse scan; M and A are then closed-form least squares on the basis
 * x = −cos(2π(day − p)/365). Needs ≥ 3 points (throws otherwise — the app's
 * frost tiles always carry all thresholds; only stripped test fixtures don't,
 * and the harness feeds those from the nearest real station).
 */
export function modelSiteClimate(site: SiteContext): SiteClimate {
  const pts = frostPoints(site);
  if (pts.length < 3) {
    throw new Error(
      `modelSiteClimate: only ${pts.length} frost point(s) at station ` +
        `${site.frost.station.id} — need ≥3 threshold crossings to fit the curve`
    );
  }

  let best: { p: number; M: number; A: number; sse: number } | null = null;
  for (let p = -60; p <= 90; p++) {
    let n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (const { day, tempF } of pts) {
      const x = -Math.cos((2 * Math.PI * (day - p)) / 365);
      n += 1; sx += x; sy += tempF; sxx += x * x; sxy += x * tempF;
    }
    const denom = n * sxx - sx * sx;
    if (Math.abs(denom) < 1e-9) continue;
    const A = (n * sxy - sx * sy) / denom;
    const M = (sy - A * sx) / n;
    let sse = 0;
    for (const { day, tempF } of pts) {
      const x = -Math.cos((2 * Math.PI * (day - p)) / 365);
      const pred = M + A * x;
      sse += (pred - tempF) ** 2;
    }
    if (!best || sse < best.sse) best = { p, M, A, sse };
  }
  if (!best) throw new ClimateModelError("modelSiteClimate: degenerate fit");

  const amplF = Math.abs(best.A);
  const rmseF = Math.sqrt(best.sse / pts.length);
  const last = site.frost.lastFrost["32/50"];
  const first = site.frost.firstFrost["32/50"];
  // Guard against frost-free / near-frost-free sites: with no real winter the
  // cold crossings collapse and the least-squares fit blows up (amplitudes of
  // hundreds of °F). Refuse honestly rather than emit nonsense — the heat-timed
  // desert needs the real max-temp tiles this model does not carry.
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

  // Normalize a negative coldest-day phase into 1..365.
  const coldestDay = ((Math.round(best.p) - 1) % 365 + 365) % 365 + 1;
  return {
    meanMinF: best.M,
    amplF,
    coldestDay,
    // Guaranteed present: the frost-free-span guard above rejects the fit unless
    // both 32/50 crossings exist and bracket a real winter.
    lastFrostDay: last as number,
    firstFrostDay: first as number,
    rmseF,
    points: pts.length,
    heatModeled: false,
  };
}

/** Daily-min temperature (°F) on day-of-year `day` (may be <1 or >365; wraps). */
export function minTempF(c: SiteClimate, day: number): number {
  return c.meanMinF - c.amplF * Math.cos((2 * Math.PI * (day - c.coldestDay)) / 365);
}

/** Estimated daily-max temperature (°F): daily min + the assumed diurnal range. */
export function maxTempF(c: SiteClimate, day: number): number {
  return minTempF(c, day) + DIURNAL_RANGE_F;
}

/** Estimated daily-mean temperature (°F). */
export function meanTempF(c: SiteClimate, day: number): number {
  return minTempF(c, day) + DIURNAL_RANGE_F / 2;
}
