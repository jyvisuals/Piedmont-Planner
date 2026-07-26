// The "Now" view selector (pure, testable).
// Given the same half-month grids the app already renders and today's
// day-of-year, returns the actions worth doing at a site right now — grouped by
// activity, with the highest-value nudge (windows about to close) flagged.
//
// This is deliberately a function of the STATIC grid only: it works identically
// for curated (verbatim) and computed calendars, and needs no new data. It is
// the frame the temporal data sources (phenology, frost alerts, pests, drought)
// will later attach advisories to — see docs/additional-data-sources.md.
import { MONTH_IDS, SLOTS, normalizeDay } from "./resolve.js";
const MONTH_NAMES = {
    jan: "January", feb: "February", mar: "March", apr: "April",
    may: "May", jun: "June", jul: "July", aug: "August",
    sep: "September", oct: "October", nov: "November", dec: "December",
};
// Order and labels for the action groups shown in the Now view.
const GROUP_ORDER = [
    { code: "si", label: "Sow indoors" },
    { code: "s", label: "Sow outdoors" },
    { code: "B", label: "Plant sets / bulbs" },
    { code: "sg", label: "Sow under cover" },
    { code: "t", label: "Transplant out" },
    { code: "tg", label: "Transplant under cover" },
    { code: "h", label: "Harvest" },
    { code: "*", label: "Special handling" },
];
/** Which 0..23 half-month slot a day-of-year falls in. */
export function slotOfDay(dayOfYear) {
    const d = normalizeDay(dayOfYear);
    for (let i = 0; i < SLOTS.length; i++) {
        const s = SLOTS[i];
        if (d >= s.start && d <= s.end)
            return i;
    }
    return 0;
}
function slotLabel(slotIndex) {
    const s = SLOTS[((slotIndex % 24) + 24) % 24];
    const half = s.half === "half1" ? "Early" : "Late";
    return `${half} ${MONTH_NAMES[s.month]}`;
}
function codesAt(grid, slotIndex) {
    const s = SLOTS[((slotIndex % 24) + 24) % 24];
    return new Set(grid[s.month][s.half]);
}
/**
 * Compute the Now view.
 * @param rows       crops in the app's active shape
 * @param todayDoy   today's day-of-year (1..365/366)
 * @param slotsAhead how many half-month slots beyond the current one to include
 *                   (default 1 → roughly the next 2–4 weeks)
 */
export function computeNow(rows, todayDoy, slotsAhead = 1) {
    const current = slotOfDay(todayDoy);
    const horizon = Math.max(0, Math.floor(slotsAhead));
    const windowSlots = [];
    for (let k = 0; k <= horizon; k++)
        windowSlots.push((current + k) % 24);
    const windowSet = new Set(windowSlots);
    const byCode = new Map();
    for (const row of rows) {
        // A code is actionable if it appears in any slot within the window.
        const present = new Set();
        for (const slot of windowSlots) {
            for (const code of codesAt(row.grid, slot))
                present.add(code);
        }
        if (!present.size)
            continue;
        const prevCodes = codesAt(row.grid, (current + 23) % 24); // slot before today
        const nextCodes = codesAt(row.grid, (current + horizon + 1) % 24); // slot after window
        for (const code of present) {
            // "ending soon": in the window but NOT in the slot just past it.
            const endingSoon = !nextCodes.has(code);
            // "just opened": in the window but NOT in the slot just before today.
            const justOpened = !prevCodes.has(code);
            const list = byCode.get(code) ?? [];
            list.push({
                key: row.key,
                name: row.name,
                type: row.type,
                computedEstimate: Boolean(row.computedEstimate),
                ...(row.limiting !== undefined ? { limiting: row.limiting } : {}),
                ...(row.confidence !== undefined ? { confidence: row.confidence } : {}),
                code,
                endingSoon,
                justOpened,
            });
            byCode.set(code, list);
        }
    }
    const groups = [];
    let count = 0;
    for (const { code, label } of GROUP_ORDER) {
        const items = byCode.get(code);
        if (!items || !items.length)
            continue;
        // Ending windows lead (miss-risk first), brand-new windows trail, everything
        // else in the middle — then alphabetical within each tier.
        const rank = (i) => (i.endingSoon ? 0 : i.justOpened ? 2 : 1);
        items.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
        groups.push({ code, label, items });
        count += items.length;
    }
    return { slotLabel: slotLabel(current), slotsAhead: horizon, groups, count };
}
// Re-exported so callers (and tests) can label months without duplicating.
export { MONTH_IDS, MONTH_NAMES };
