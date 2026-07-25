// The COMPUTED base layer (D2/D8): generic anchored timing rules derived from a
// crop's catalog entry alone — hardiness class + structured days-to-maturity.
// Pure data-in/data-out: no Node/browser imports, no I/O; the resolver feeds the
// returned events through the same anchored-event path curated packs use.
//
// These are ESTIMATE-GRADE rules by design (D8: computed is never dressed as
// curated). They are deliberately conservative and simple — a defensible
// national baseline that a curated pack row overrides, not competes with.
//
// Rule table (offsets in days; negative = before the anchor):
//
//   hardiness    DTH present   events
//   ----------   -----------   ----------------------------------------------
//   tender       transplant    sowIndoors  lastFrost  [-42, -28]   (6–4 wk lead)
//                              transplant  lastFrost  [ +7, +21]   (after danger)
//                              harvest(transplant)
//   tender       direct        sowOutdoors lastFrost  [ +7, +28]   (warm soil)
//                              harvest(direct)
//   half-hardy   transplant    sowIndoors  lastFrost  [-49, -35]   (7–5 wk lead)
//                              transplant  lastFrost  [ -7, +14]   (light frost ok)
//                              harvest(transplant)
//   half-hardy   direct        sowOutdoors lastFrost  [-14, +14]
//                              harvest(direct)
//                              + FALL window (see below)
//   hardy /      direct        sowOutdoors lastFrost  [-45, -15]   (early spring)
//   very-hardy                 harvest(direct)
//                              + FALL window (see below)
//   hardy /      transplant    sowIndoors  lastFrost  [-63, -49]   (9–7 wk lead)
//   very-hardy   only          transplant  lastFrost  [-21,   0]   (frost-tolerant)
//                              harvest(transplant)
//   perennial    (any)         null — establishment schedules are not something
//                              a generic annual-timing rule can honestly guess
//   (any)        none usable   null — no DTH range means no derived harvest and
//                              no way to size a fall window; stay silent
//
// FALL window (half-hardy and hardy classes, only when a direct DTH exists):
// count BACKWARD from firstFrost, sized by the DTH range, with 14 extra days of
// lead on the early edge to buy slowing autumn growth. The LATE edge depends on
// frost tolerance:
//   - half-hardy (frost ends the crop): late edge = -(maxDTH), so even the
//     slowest maturity in the range lands by the average first freeze — the
//     derived harvest window can never overshoot frost.
//   - hardy/very-hardy (frost-tolerant): late edge = -(minDTH); the derived
//     harvest may deliberately run past the frost date, because these crops
//     survive it (and often improve — the curated data harvests kale and
//     spinach well into winter).
// Tender crops get no computed fall window: a frost-killed crop maturing INTO
// frost is not a conservative estimate.
//
// When both DTH methods exist, both corresponding schedules are emitted (e.g. a
// tender crop with transplant AND direct ranges gets both runs), except for the
// hardy transplant path, which is a fallback used only when direct is absent —
// hardy crops with a direct range are direct-sown in practice and adding an
// invented indoor schedule on top would be noise, not signal.
/** A DTH range is usable when it is a well-formed positive interval. */
function usable(range) {
    if (!range)
        return null;
    const [lo, hi] = range;
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo <= 0 || hi < lo)
        return null;
    return range;
}
function springTransplantRun(events, indoorOffset, setOutOffset) {
    events.push({
        id: "computed-si-spring",
        activity: "sowIndoors",
        anchor: { kind: "lastFrost" },
        offsetDays: indoorOffset,
    }, {
        id: "computed-t-spring",
        activity: "transplant",
        anchor: { kind: "lastFrost" },
        offsetDays: setOutOffset,
    }, {
        id: "computed-h-spring-transplant",
        activity: "harvest",
        fromEventId: "computed-t-spring",
        method: "transplant",
    });
}
function springDirectRun(events, sowOffset) {
    events.push({
        id: "computed-s-spring",
        activity: "sowOutdoors",
        anchor: { kind: "lastFrost" },
        offsetDays: sowOffset,
    }, {
        id: "computed-h-spring-direct",
        activity: "harvest",
        fromEventId: "computed-s-spring",
        method: "direct",
    });
}
/**
 * Succession run for warm-season direct-sown crops: sow continuously from just
 * after last frost until the last date a planting can still mature before first
 * frost (`firstFrost − maxDTH`). This is the single biggest fidelity gap the
 * validation harness found — curated packs sow beans/squash/cucumbers across
 * the whole summer while a single-window rule showed one date. The window is a
 * two-anchor span (lastFrost start, firstFrost end), so it self-adjusts by
 * season length and DTH: short-DTH crops get a long run, long-DTH crops (winter
 * squash) get a correctly shorter one. Cool crops are NOT given this (they bolt
 * in summer heat) — they keep the spring + fall two-window pattern.
 */
function successionDirectRun(events, direct) {
    const [, maxDth] = direct;
    events.push({
        id: "computed-s-spring",
        activity: "sowOutdoors",
        anchor: { kind: "lastFrost" },
        offsetDays: [7, -maxDth], // start: lastFrost+7 ; end: firstFrost−maxDth
        endAnchor: { kind: "firstFrost" },
    }, {
        id: "computed-h-spring-direct",
        activity: "harvest",
        fromEventId: "computed-s-spring",
        method: "direct",
    });
}
/**
 * Backward-counted fall run, sized by the DTH range. For frost-intolerant
 * (half-hardy) crops the late edge reserves maxDTH so the slowest maturity
 * still lands by frost; frost-tolerant crops keep the -minDTH late edge and
 * may harvest past the frost date on purpose.
 */
function fallDirectRun(events, direct, frostTolerant) {
    const [minDth, maxDth] = direct;
    events.push({
        id: "computed-s-fall",
        activity: "sowOutdoors",
        anchor: { kind: "firstFrost" },
        offsetDays: [-(maxDth + 14), frostTolerant ? -minDth : -maxDth],
    }, {
        id: "computed-h-fall-direct",
        activity: "harvest",
        fromEventId: "computed-s-fall",
        method: "direct",
    });
}
/**
 * Generic anchored timing for a catalog entry, or null when no honest estimate
 * exists (perennials, entries without a usable DTH range). The resolver runs
 * the result through the normal anchored-event path with `origin: "computed"`
 * and NO provenance — absence of provenance is the honesty marker (D8).
 */
export function computedEvents(entry) {
    if (entry.hardiness === "perennial")
        return null;
    const direct = usable(entry.daysToMaturity.direct);
    const transplant = usable(entry.daysToMaturity.transplant);
    if (!direct && !transplant)
        return null;
    const events = [];
    // Overwintered crops (garlic): planted in fall around first frost, harvested
    // the following season. Handled first because the hardiness-based spring
    // rules below would otherwise plant them in spring — the misplacement Path A1
    // surfaced. The cross-year harvest is fine on the season-day axis.
    if (entry.overwinter) {
        events.push({
            id: "computed-overwinter-set",
            activity: "plantSet",
            anchor: { kind: "firstFrost" },
            offsetDays: [-45, 14], // ~6 weeks before to ~2 weeks after first frost
        });
        const method = direct ? "direct" : "transplant";
        events.push({ id: "computed-h-overwinter", activity: "harvest", fromEventId: "computed-overwinter-set", method });
        return events;
    }
    switch (entry.hardiness) {
        case "tender":
            if (transplant)
                springTransplantRun(events, [-42, -28], [7, 21]);
            if (direct)
                successionDirectRun(events, direct); // warm-season: sow all summer
            break;
        case "half-hardy":
            if (transplant)
                springTransplantRun(events, [-49, -35], [-7, 14]);
            if (direct) {
                springDirectRun(events, [-14, 14]);
                fallDirectRun(events, direct, false);
            }
            break;
        case "hardy":
        case "very-hardy":
            if (direct) {
                springDirectRun(events, [-45, -15]);
                fallDirectRun(events, direct, true);
            }
            else if (transplant) {
                springTransplantRun(events, [-63, -49], [-21, 0]);
            }
            break;
    }
    return events.length > 0 ? events : null;
}
