// The climate-suitability engine (Step 3, docs/climate-suitability-model.md):
// the general COMPUTED base layer that scores every day of the year for how
// likely a crop is to complete its life-span successfully, from the crop's
// climate requirements (schema/climate/crop-climate.ts) and the site's modeled
// temperature climatology (climate-model.ts). Frost and heat are not special
// anchors here — they are just where the survival factors go to zero.
//
// This is the TEMPERATURE-FIRST cut the doc calls for: Suitability(day) =
// germFit · frostSurvival · tempFit, each ∈ [0,1], multiplied. Moisture and
// day-length factors are deliberately omitted until temperature proves out on
// the validation harness. Output is a 365-day suitability curve, a 24-slot
// reduction of it, and the high-scoring spans as ResolvedWindows (byte-
// compatible with the offset engine's output, so the resolver, grid bucketing,
// and validation harness all consume it unchanged).
//
// Pure and synchronous: no I/O, no clock.
import { climateFor } from "../climate/crop-climate.js";
import { maxTempF, meanTempF, minTempF } from "./climate-model.js";
const HARD_FREEZE_F = 32;
function clamp01(x) {
    return x < 0 ? 0 : x > 1 ? 1 : x;
}
/** Smooth 0→1 ramp across [a, b] (Hermite). */
function smoothstep(a, b, x) {
    if (a === b)
        return x < a ? 0 : 1;
    const t = clamp01((x - a) / (b - a));
    return t * t * (3 - 2 * t);
}
/** Per-day growth comfort ∈ [0,1]: cold-limited below, heat-limited above. */
function dayComfort(cc, minF, maxF) {
    const mean = (minF + maxF) / 2;
    const cold = clamp01((mean - cc.baseF) / Math.max(1, cc.optMinF - cc.baseF));
    const heat = clamp01((cc.ceilingF - maxF) / Math.max(1, cc.ceilingF - cc.optMaxF));
    return Math.min(cold, heat);
}
/**
 * Suitability of planting on `plantDay` for a life-span of `lo`..`hi` days:
 *   germFit        — daily-min over the establishment window meets germMinF.
 *   frostSurvival  — for frost-killed crops, the span reaches maturity before a
 *                    killing freeze (ramps from 0 if frost hits before earliest
 *                    maturity to 1 if it survives past latest maturity); 1 for
 *                    frost-tolerant crops.
 *   tempFit        — mean growth comfort across the whole span.
 */
function scorePlanting(cc, climate, plantDay, lo, hi, isDirect) {
    // germFit over the establishment window — DIRECT sowing only. Germination is
    // gated on the daily-MEAN temperature (a soil-temperature proxy; daily-min is
    // air and runs colder than the seedbed). Transplants are already-established
    // seedlings, so they are not germination-gated — their limit is frost survival
    // and growth comfort, which is why set-out can precede warm soil.
    let germFit = 1;
    if (isDirect) {
        const estabEnd = plantDay + Math.min(14, lo);
        let meanSum = 0;
        let meanN = 0;
        for (let d = plantDay; d <= estabEnd; d++) {
            meanSum += meanTempF(climate, d);
            meanN += 1;
        }
        germFit = smoothstep(cc.germMinF - 6, cc.germMinF + 6, meanSum / meanN);
    }
    // frostSurvival: how far into the span the crop gets before a killing freeze.
    let frostSurvival = 1;
    if (cc.frostKilled) {
        let survived = hi;
        for (let k = 1; k <= hi; k++) {
            if (minTempF(climate, plantDay + k) <= HARD_FREEZE_F) {
                survived = k;
                break;
            }
        }
        // 0 if a freeze hits before earliest maturity; 1 if it survives past latest.
        frostSurvival = clamp01((survived - lo) / Math.max(1, hi - lo));
        if (survived >= hi)
            frostSurvival = 1;
    }
    // tempFit across the whole maturity span.
    let comfortSum = 0;
    let comfortN = 0;
    for (let d = plantDay; d <= plantDay + hi; d++) {
        comfortSum += dayComfort(cc, minTempF(climate, d), maxTempF(climate, d));
        comfortN += 1;
    }
    const tempFit = comfortSum / comfortN;
    return germFit * frostSurvival * tempFit;
}
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
        const start = climate.firstFrostDay - 45;
        const end = climate.firstFrostDay + 14;
        const curve = new Array(365).fill(0);
        for (let d = start; d <= end; d++)
            curve[((d - 1) % 365 + 365) % 365] = 1;
        const slotCurve = SLOT_BOUNDS.map(([a, b]) => {
            let mx = 0;
            for (let d = a; d <= b; d++)
                mx = Math.max(mx, curve[d - 1]);
            return mx;
        });
        return { origin: "computed", curve, slotCurve, windows: [{ activity: "plantSet", start, end }] };
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
        const mCurve = new Array(365);
        let peak = 0;
        for (let i = 0; i < 365; i++) {
            const s = scorePlanting(cc, climate, i + 1, lo, hi, isDirect);
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
            windows.push({ activity: m.activity, start, end });
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
