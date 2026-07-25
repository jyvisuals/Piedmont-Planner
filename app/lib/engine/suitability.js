// The climate-suitability engine (Steps 3+, docs/climate-suitability-model.md):
// the general COMPUTED base layer that scores every day of the year for how
// likely a crop is to complete its life-span successfully, from the crop's
// climate requirements (schema/climate/crop-climate.ts) and the site's modeled
// temperature climatology (climate-model.ts). Frost and heat are not special
// anchors here — they are just factors whose probability goes to zero.
//
// PROBABILISTIC: each factor is a real probability computed from the climate
// DISTRIBUTION (per-slot mean AND stddev — the spread the temperature tiles
// already ship). Suitability(day) = pGerm · pFrost · pHeat · growthFit, each
// ∈ [0,1]. Two aggregations, by hazard semantics:
//   frost is a KILL switch  → P(no killing freeze anywhere in the span) = the
//                             product of daily non-freeze probabilities.
//   heat is a STRESS gradient→ the mean daily non-exceedance probability over the
//                             sensitive stage (a few hot days don't zero a crop).
// Where the tiles carry zero spread (the frost-derived fallback) the normal CDF
// degrades to the old step behavior, so nothing breaks.
//
// REASON CODES: every emitted window records which factor binds it (the limiting
// factor at the window's optimum) and its peak success probability — the
// "dominant limiting factor" the design doc calls for. Output is a 365-day
// curve, a 24-slot reduction, and PlantingWindows (a superset of ResolvedWindow,
// so the resolver, grid bucketing, and validation harness consume them unchanged).
//
// Pure and synchronous: no I/O, no clock.
import { climateFor } from "../climate/crop-climate.js";
import { maxSpreadF, maxTempF, meanSpreadF, meanTempF, minSpreadF, minTempF } from "./climate-model.js";
const HARD_FREEZE_F = 32;
function clamp01(x) {
    return x < 0 ? 0 : x > 1 ? 1 : x;
}
// --- normal-distribution helpers (Abramowitz-Stegun 7.1.26 erf) --------------
function erf(x) {
    const t = 1 / (1 + 0.3275911 * Math.abs(x));
    const y = 1 -
        ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
            t *
            Math.exp(-x * x);
    return x >= 0 ? y : -y;
}
function normCdf(z) {
    return 0.5 * (1 + erf(z / Math.SQRT2));
}
/** P(X ≥ threshold) for X ~ Normal(mean, sd). Degrades to a step when sd≈0. */
function pAtLeast(mean, sd, threshold) {
    if (sd <= 0.01)
        return mean >= threshold ? 1 : 0;
    return 1 - normCdf((threshold - mean) / sd);
}
/** P(X ≤ threshold) for X ~ Normal(mean, sd). Degrades to a step when sd≈0. */
function pAtMost(mean, sd, threshold) {
    if (sd <= 0.01)
        return mean <= threshold ? 1 : 0;
    return normCdf((threshold - mean) / sd);
}
function limitingOf(f) {
    let key = "germ";
    let min = f.germ;
    if (f.frost < min) {
        min = f.frost;
        key = "frost";
    }
    if (f.heat < min) {
        min = f.heat;
        key = "heat";
    }
    if (f.growth < min) {
        min = f.growth;
        key = "growth";
    }
    if (f.fruitSet < min) {
        min = f.fruitSet;
        key = "fruitSet";
    }
    switch (key) {
        case "germ": return "soil-temp";
        case "frost": return "frost";
        case "heat": return "heat";
        case "fruitSet": return "night-heat";
        default: return "cold-growth";
    }
}
/**
 * Probabilistic suitability of planting on `plantDay` for a `lo`..`hi`-day span,
 * returned as a factor breakdown (multiply for the scalar score). Each factor is
 * a probability under the site's climate distribution — see the file header for
 * the two aggregation rules (frost = product/kill, heat = mean/stress).
 */
function scorePlanting(cc, climate, plantDay, lo, hi, isDirect) {
    // germ: P(establishment daily-MEAN ≥ gate). Direct sow needs germMinF to
    // germinate from seed; a transplant is already grown, but must still root, so
    // it needs warmth above the growth base (baseF+8). Mean temp is a soil proxy.
    const estabEnd = plantDay + Math.min(isDirect ? 14 : 21, lo);
    let meanSum = 0, meanSdSum = 0, n = 0;
    for (let d = plantDay; d <= estabEnd; d++) {
        meanSum += meanTempF(climate, d);
        meanSdSum += meanSpreadF(climate, d);
        n += 1;
    }
    const gateF = isDirect ? cc.germMinF : cc.baseF + 8;
    const germ = pAtLeast(meanSum / n, meanSdSum / n, gateF);
    // frost: KILL semantics — P(no freeze on ANY span day) = product of daily
    // non-freeze probabilities. In-season this is ≈1; near the frost edge it falls
    // off smoothly (and slightly conservatively, which is correct for a kill risk).
    let frost = 1;
    if (cc.frostKilled) {
        for (let k = 1; k <= hi; k++) {
            const d = plantDay + k;
            frost *= 1 - pAtMost(minTempF(climate, d), minSpreadF(climate, d), HARD_FREEZE_F);
            if (frost < 1e-4) {
                frost = 0;
                break;
            }
        }
    }
    // heat: STRESS semantics — mean daily P(max ≤ ceiling) across the WHOLE span.
    // Averaging (not producting) is right because a few hot days stress but don't
    // zero a crop. Whole-span (not just the reproductive stage) is deliberate: it
    // catches lethal establishment heat too — a transplant set into a 107°F desert
    // summer dies regardless of when it would have flowered. A gentler, night-
    // specific fruit-set threshold is the separate next step (docs step 2).
    let heatSum = 0, heatN = 0;
    for (let d = plantDay; d <= plantDay + hi; d++) {
        heatSum += pAtMost(maxTempF(climate, d), maxSpreadF(climate, d), cc.ceilingF);
        heatN += 1;
    }
    const heat = heatSum / heatN;
    // growth: cold-limited adequacy (mean temp vs the crop's growth band), the
    // "too cold to develop" factor distinct from the frost KILL above.
    let growthSum = 0, growthN = 0;
    for (let d = plantDay; d <= plantDay + hi; d++) {
        const mean = meanTempF(climate, d);
        growthSum += clamp01((mean - cc.baseF) / Math.max(1, cc.optMinF - cc.baseF));
        growthN += 1;
    }
    const growth = growthSum / growthN;
    // fruitSet: reproductive NIGHT-temperature suitability, only for warm fruiting
    // crops that carry night limits. Evaluated over the flowering/fruiting stage
    // (the back ~60% of the span), on the daily MIN (night low). This is the
    // "warm crop fails in midsummer despite no frost" factor — pollen sterility.
    let fruitSet = 1;
    if (cc.nightSetMaxF !== undefined || cc.nightSetMinF !== undefined) {
        const repStart = plantDay + Math.round(hi * 0.4);
        let setSum = 0, setN = 0;
        for (let d = repStart; d <= plantDay + hi; d++) {
            const nMean = minTempF(climate, d);
            const nSd = minSpreadF(climate, d);
            let p = 1;
            if (cc.nightSetMaxF !== undefined)
                p *= pAtMost(nMean, nSd, cc.nightSetMaxF);
            if (cc.nightSetMinF !== undefined)
                p *= pAtLeast(nMean, nSd, cc.nightSetMinF);
            setSum += p;
            setN += 1;
        }
        fruitSet = setN ? setSum / setN : 1;
    }
    return { germ, frost, heat, growth, fruitSet };
}
const scoreOf = (f) => f.germ * f.frost * f.heat * f.growth * f.fruitSet;
// 24 half-month slot boundaries (day-of-year), mirroring resolve.ts SLOTS.
const MONTH_LEN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const SLOT_BOUNDS = (() => {
    const out = [];
    let day = 1;
    for (const len of MONTH_LEN) {
        out.push([day, day + 14]);
        out.push([day + 15, day + len - 1]);
        day += len;
    }
    return out;
})();
/**
 * Extract maximal contiguous runs where the curve is at/above `threshold`,
 * treated CIRCULARLY (a cool-crop winter window wrapping Dec→Feb is one run).
 * Returns [startDay, endDay] pairs on the season-day axis; a wrapping run has
 * endDay > 365 so the grid bucketer's modulo handles the wrap.
 */
function runsAbove(curve, threshold) {
    const n = curve.length;
    const above = curve.map((v) => v >= threshold);
    if (above.every((b) => b))
        return [[1, n]];
    if (above.every((b) => !b))
        return [];
    // Rotate to a start that is below threshold so no run straddles index 0.
    let start = 0;
    while (above[start])
        start += 1;
    const runs = [];
    let i = 0;
    while (i < n) {
        const idx = (start + i) % n;
        if (above[idx]) {
            const runStartDay = idx + 1;
            let len = 0;
            while (i < n && above[(start + i) % n]) {
                len += 1;
                i += 1;
            }
            runs.push([runStartDay, runStartDay + len - 1]);
        }
        else {
            i += 1;
        }
    }
    return runs;
}
/**
 * Score a crop at a site. Returns null when there is no honest estimate
 * (perennial / no climate profile / no usable days-to-maturity). Emits one set
 * of planting windows per available sowing method (direct → sowOutdoors,
 * transplant → transplant), so the output mirrors what is actually plantable
 * outdoors.
 */
export function suitabilityFor(entry, climate) {
    const cc = climateFor(entry);
    if (!cc)
        return null;
    // Overwintered crops (garlic): fall-planted and carried through winter, then
    // harvested the next season. A pure growth-comfort model cannot infer this —
    // it scores the warm spring higher — so it respects the SAME catalog flag the
    // offset engine uses (known biology, not a fabricated window): plant in a band
    // around first frost. Mirrors computed-rules.ts's overwinter branch.
    if (entry.overwinter) {
        // Anchor to first frost; in a frost-free climate (no crossing) fall back to
        // the coldest half-month's midpoint, which is what overwintering is timed to.
        let anchor = climate.firstFrostDay;
        if (!Number.isFinite(anchor)) {
            let coldest = 0;
            for (let i = 1; i < 24; i++) {
                if (climate.tminF[i] < climate.tminF[coldest])
                    coldest = i;
            }
            anchor = Math.round(((coldest + 0.5) * 365) / 24);
        }
        const start = anchor - 45;
        const end = anchor + 14;
        const curve = new Array(365).fill(0);
        for (let d = start; d <= end; d++)
            curve[((d - 1) % 365 + 365) % 365] = 1;
        const slotCurve = SLOT_BOUNDS.map(([a, b]) => {
            let mx = 0;
            for (let d = a; d <= b; d++)
                mx = Math.max(mx, curve[d - 1]);
            return mx;
        });
        return {
            origin: "computed",
            curve,
            slotCurve,
            windows: [{ activity: "plantSet", start, end, confidence: 1, limiting: "cold-growth" }],
        };
    }
    const methods = [];
    if (entry.daysToMaturity.direct)
        methods.push({ activity: "sowOutdoors", dth: entry.daysToMaturity.direct });
    if (entry.daysToMaturity.transplant)
        methods.push({ activity: "transplant", dth: entry.daysToMaturity.transplant });
    if (!methods.length)
        return null;
    // Combined day-curve is the best score across methods (what's plantable at all).
    const curve = new Array(365).fill(0);
    const windows = [];
    for (const m of methods) {
        const [lo, hi] = m.dth;
        const isDirect = m.activity === "sowOutdoors";
        const mFactors = new Array(365);
        const mCurve = new Array(365);
        let peak = 0;
        for (let i = 0; i < 365; i++) {
            const f = scorePlanting(cc, climate, i + 1, lo, hi, isDirect);
            const s = scoreOf(f);
            mFactors[i] = f;
            mCurve[i] = s;
            if (s > peak)
                peak = s;
            if (s > curve[i])
                curve[i] = s;
        }
        // No plantable season for this method here (e.g. season too short/hot).
        if (peak < 0.2)
            continue;
        // Windows are the upper band of the suitability peak. 0.7·peak (floor 0.4)
        // was the fidelity/breadth sweet spot on the validation harness — lower
        // paints windows too broad, higher clips the season's shoulders and starts
        // missing reference slots. Primary-timing is flat across the range.
        const threshold = Math.max(0.4, 0.7 * peak);
        for (const [start, end] of runsAbove(mCurve, threshold)) {
            // Reason code + confidence come from the window's OPTIMUM day (its tightest
            // constraint there is the dominant limiting factor for the recommendation).
            let bestI = ((start - 1) % 365 + 365) % 365;
            let bestS = mCurve[bestI];
            for (let d = start; d <= end; d++) {
                const idx = ((d - 1) % 365 + 365) % 365;
                if (mCurve[idx] > bestS) {
                    bestS = mCurve[idx];
                    bestI = idx;
                }
            }
            windows.push({
                activity: m.activity,
                start,
                end,
                confidence: Math.round(bestS * 100) / 100,
                limiting: limitingOf(mFactors[bestI]),
            });
        }
    }
    // 24-slot reduction: peak suitability within each slot.
    const slotCurve = SLOT_BOUNDS.map(([a, b]) => {
        let mx = 0;
        for (let d = a; d <= b; d++) {
            const v = curve[d - 1];
            if (v > mx)
                mx = v;
        }
        return mx;
    });
    return { origin: "computed", curve, slotCurve, windows };
}
