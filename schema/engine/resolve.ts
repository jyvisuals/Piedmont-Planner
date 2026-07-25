// The offset engine + resolver core (D0/D1/D2/D5).
// Pure and synchronous by design: no Node/browser imports, no I/O, no clock —
// everything comes in through the plain-data SiteContext and the typed inputs,
// so the same file runs in the browser, in node:test, and in a worker.
//
// v1 scope notes (loud, per "no silent caps"):
// - `soilTemp` and `gddAccum` are supported as *gates* (flagged on the resolved
//   window for the live-weather layer) but NOT as primary anchors — resolving
//   them needs climatology the SiteContext doesn't carry yet. Using one as a
//   primary anchor throws.
// - `counties` footprints need a point→FIPS lookup the client doesn't ship yet;
//   testing containment against one throws rather than silently never matching.

import type {
  Activity,
  AnchoredEvent,
  AnchorRef,
  CropCatalog,
  CropCatalogEntry,
  DayOfYear,
  Footprint,
  FrostAnchorRef,
  FrostKey,
  HalfMonthCode,
  HalfMonthGrid,
  MonthId,
  PackCropOverride,
  PackTiming,
  RegionPack,
  ResolveInput,
  ResolvedCropCalendar,
  ResolvedWindow,
  SeasonDay,
  SiteContext,
  TimingEvent,
} from "../types.ts";
import { DEFAULT_FROST_REF } from "../types.ts";
import { computedEvents } from "./computed-rules.ts";

// ---------------------------------------------------------------------------
// Calendar geometry (non-leap 365-day year; leap day is noise at this scale)
// ---------------------------------------------------------------------------

export const MONTH_IDS: readonly MonthId[] = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

const MONTH_LEN: readonly number[] = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

interface Slot {
  month: MonthId;
  half: "half1" | "half2";
  start: DayOfYear; // inclusive
  end: DayOfYear; // inclusive
}

/** The 24 half-month slots with their day ranges. half1 = days 1–15. */
export const SLOTS: readonly Slot[] = (() => {
  const slots: Slot[] = [];
  let day = 1;
  MONTH_IDS.forEach((month, i) => {
    const len = MONTH_LEN[i]!;
    slots.push({ month, half: "half1", start: day, end: day + 14 });
    slots.push({ month, half: "half2", start: day + 15, end: day + len - 1 });
    day += len;
  });
  return slots;
})();

/** Normalize a SeasonDay (may be ≤0 or >365) into 1..365 — render-time only. */
export function normalizeDay(day: SeasonDay): DayOfYear {
  return ((Math.round(day) - 1) % 365 + 365) % 365 + 1;
}

function slotIndexOf(day: DayOfYear): number {
  // 24 slots over 365 days; linear scan is fine and obviously correct.
  for (let i = 0; i < SLOTS.length; i++) {
    const s = SLOTS[i]!;
    if (day >= s.start && day <= s.end) return i;
  }
  throw new Error(`day out of range: ${day}`);
}

/** Day-of-year (non-leap) for a calendar month/day. */
export function calendarDayOfYear(month: number, day: number): DayOfYear {
  if (month < 1 || month > 12) throw new Error(`bad month: ${month}`);
  const len = MONTH_LEN[month - 1]!;
  if (day < 1 || day > len) throw new Error(`bad day ${day} for month ${month}`);
  let doy = day;
  for (let m = 0; m < month - 1; m++) doy += MONTH_LEN[m]!;
  return doy;
}

export function emptyGrid(): HalfMonthGrid {
  const grid = {} as HalfMonthGrid;
  for (const m of MONTH_IDS) grid[m] = { half1: [], half2: [] };
  return grid;
}

export function cloneGrid(grid: HalfMonthGrid): HalfMonthGrid {
  const out = {} as HalfMonthGrid;
  for (const m of MONTH_IDS) {
    out[m] = { half1: [...grid[m].half1], half2: [...grid[m].half2] };
  }
  return out;
}

// ---------------------------------------------------------------------------
// Photoperiod (pure computation from latitude — Forsythe et al. 1995 CBM model)
// ---------------------------------------------------------------------------

const DEG = Math.PI / 180;
/** Sun angle below horizon counted as daylight (refraction + solar disk), deg. */
const DAYLIGHT_COEF = 0.8333;

/** Day length in hours at `lat` on day-of-year `j` (1..365). */
export function daylengthHours(lat: number, j: DayOfYear): number {
  const theta = 0.2163108 + 2 * Math.atan(0.9671396 * Math.tan(0.0086 * (j - 186)));
  const phi = Math.asin(0.39795 * Math.cos(theta));
  const x =
    (Math.sin(DAYLIGHT_COEF * DEG) + Math.sin(lat * DEG) * Math.sin(phi)) /
    (Math.cos(lat * DEG) * Math.cos(phi));
  const clamped = Math.max(-1, Math.min(1, x));
  return 24 - (24 / Math.PI) * Math.acos(clamped);
}

/**
 * First day-of-year where day length crosses `hours` in `direction`,
 * or null if it never does at this latitude.
 */
export function photoperiodCrossing(
  lat: number,
  hours: number,
  direction: "lengthening" | "shortening"
): DayOfYear | null {
  for (let j = 2; j <= 365; j++) {
    const prev = daylengthHours(lat, j - 1);
    const cur = daylengthHours(lat, j);
    if (direction === "shortening" && prev >= hours && cur < hours) return j;
    if (direction === "lengthening" && prev < hours && cur >= hours) return j;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Anchor resolution against a plain-data SiteContext
// ---------------------------------------------------------------------------

export function frostKeyOf(ref: FrostAnchorRef): FrostKey {
  return `${ref.thresholdF}/${ref.probabilityPct}`;
}

export function frostDay(
  site: SiteContext,
  which: "lastFrost" | "firstFrost",
  partial?: Partial<FrostAnchorRef>
): DayOfYear {
  const ref: FrostAnchorRef = { ...DEFAULT_FROST_REF, ...partial };
  const key = frostKeyOf(ref);
  const day = site.frost[which][key];
  if (day === undefined) {
    throw new Error(
      `SiteContext frost table has no ${which} entry for ${key} ` +
        `(station ${site.frost.station.id}) — provider must supply it`
    );
  }
  return day;
}

export class UnsupportedAnchorError extends Error {}

/** Resolve an anchor to a day-of-year. Throws on v1-unsupported primary anchors. */
export function anchorDay(site: SiteContext, anchor: AnchorRef): DayOfYear {
  switch (anchor.kind) {
    case "lastFrost":
      return frostDay(site, "lastFrost", anchor.ref);
    case "firstFrost":
      return frostDay(site, "firstFrost", anchor.ref);
    case "calendarDate":
      return calendarDayOfYear(anchor.month, anchor.day);
    case "photoperiod": {
      const day = photoperiodCrossing(site.lat, anchor.hours, anchor.direction);
      if (day === null) {
        throw new Error(
          `photoperiod never crosses ${anchor.hours}h (${anchor.direction}) at lat ${site.lat}`
        );
      }
      return day;
    }
    case "soilTemp":
    case "gddAccum":
      throw new UnsupportedAnchorError(
        `"${anchor.kind}" is a gate in v1, not a primary anchor — ` +
          `resolving it needs climatology the SiteContext does not carry yet`
      );
  }
}

// ---------------------------------------------------------------------------
// Anchored events → resolved windows (season-day axis)
// ---------------------------------------------------------------------------

export function resolveAnchoredEvents(
  events: TimingEvent[],
  site: SiteContext,
  catalogEntry: CropCatalogEntry
): ResolvedWindow[] {
  const windows: ResolvedWindow[] = [];
  const planted = new Map<string, { start: SeasonDay; end: SeasonDay }>();

  // Pass 1: anchored plantings.
  for (const ev of events) {
    if (ev.activity === "harvest") continue;
    const e = ev as AnchoredEvent;
    const [lo, hi] = e.offsetDays;
    if (lo > hi) throw new Error(`event ${e.id}: offsetDays [${lo}, ${hi}] inverted`);
    const base = anchorDay(site, e.anchor);
    const span = { start: base + lo, end: base + hi };
    planted.set(e.id, span);
    windows.push({
      activity: e.activity,
      start: span.start,
      end: span.end,
      ...(e.special ? { special: true } : {}),
      ...(e.gate ? { gated: true } : {}),
      ...(e.note !== undefined ? { note: e.note } : {}),
    });
  }

  // Pass 2: derived harvests — earliest planting + min DTH .. latest + max DTH,
  // the same arithmetic the legacy review notes describe.
  for (const ev of events) {
    if (ev.activity !== "harvest") continue;
    const src = planted.get(ev.fromEventId);
    if (!src) throw new Error(`harvest ${ev.id}: unknown fromEventId "${ev.fromEventId}"`);
    const dth = catalogEntry.daysToMaturity[ev.method];
    if (!dth) {
      throw new Error(
        `harvest ${ev.id}: catalog entry "${catalogEntry.slug}" has no ` +
          `daysToMaturity.${ev.method} range`
      );
    }
    windows.push({
      activity: "harvest",
      start: src.start + dth[0],
      end: src.end + dth[1],
      ...(ev.note !== undefined ? { note: ev.note } : {}),
    });
  }

  return windows.sort((a, b) => a.start - b.start);
}

// ---------------------------------------------------------------------------
// Windows → half-month grid (render-time bucketing; year wrap happens here)
// ---------------------------------------------------------------------------

export const ACTIVITY_CODE: Record<Activity, HalfMonthCode> = {
  sowIndoors: "si",
  sowOutdoors: "s",
  sowGreenhouse: "sg",
  transplant: "t",
  transplantGreenhouse: "tg",
  plantSet: "B",
  harvest: "h",
};

const CODE_ORDER: readonly HalfMonthCode[] = ["si", "s", "sg", "t", "tg", "B", "h", "*"];

/** A window covers a slot if it overlaps it by at least one day. */
export function bucketWindows(windows: ResolvedWindow[]): HalfMonthGrid {
  const covered: Array<Set<HalfMonthCode>> = SLOTS.map(() => new Set());
  for (const w of windows) {
    if (w.end < w.start) throw new Error(`window inverted: [${w.start}, ${w.end}]`);
    const last = Math.min(w.end, w.start + 364); // ≥365 days = the whole year
    for (let d = w.start; d <= last; d++) {
      const set = covered[slotIndexOf(normalizeDay(d))]!;
      set.add(ACTIVITY_CODE[w.activity]);
      if (w.special) set.add("*");
    }
  }
  const grid = emptyGrid();
  SLOTS.forEach((slot, i) => {
    const codes = CODE_ORDER.filter((c) => covered[i]!.has(c));
    grid[slot.month][slot.half] = codes;
  });
  return grid;
}

// ---------------------------------------------------------------------------
// Pack timing → resolved calendar pieces
// ---------------------------------------------------------------------------

export function resolveCropTiming(
  timing: PackTiming,
  site: SiteContext,
  catalogEntry: CropCatalogEntry | undefined
): { grid: HalfMonthGrid; windows?: ResolvedWindow[] } {
  if (timing.kind === "verbatim") {
    // Curated grids pass through untouched — the whole point of verbatim (D2).
    return { grid: cloneGrid(timing.grid) };
  }
  if (!catalogEntry) {
    throw new Error("anchored timing needs a crop-catalog entry (for derived harvests)");
  }
  const windows = resolveAnchoredEvents(timing.events, site, catalogEntry);
  return { grid: bucketWindows(windows), windows };
}

// ---------------------------------------------------------------------------
// Footprints & pack precedence (D5: derived, most-specific wins)
// ---------------------------------------------------------------------------

export function footprintContains(fp: Footprint, lat: number, lng: number): boolean {
  switch (fp.kind) {
    case "bbox":
      return lat >= fp.minLat && lat <= fp.maxLat && lng >= fp.minLng && lng <= fp.maxLng;
    case "polygon": {
      // Ray casting.
      let inside = false;
      const ring = fp.ring;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i]!;
        const [xj, yj] = ring[j]!;
        const intersects =
          yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
        if (intersects) inside = !inside;
      }
      return inside;
    }
    case "counties":
      throw new Error(
        "counties footprint containment requires a point→FIPS lookup — not implemented in v1"
      );
  }
}

function footprintRank(fp: Footprint): number {
  return fp.kind === "counties" ? 3 : fp.kind === "polygon" ? 2 : 1;
}

function footprintAreaProxy(fp: Footprint): number {
  switch (fp.kind) {
    case "bbox":
      return Math.abs((fp.maxLat - fp.minLat) * (fp.maxLng - fp.minLng));
    case "polygon": {
      let sum = 0;
      const ring = fp.ring;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i]!;
        const [xj, yj] = ring[j]!;
        sum += xj * yi - xi * yj;
      }
      return Math.abs(sum) / 2;
    }
    case "counties":
      return 0;
  }
}

/** Sort comparator: most-specific pack first. */
export function byPrecedence(a: RegionPack, b: RegionPack): number {
  const rank = footprintRank(b.footprint) - footprintRank(a.footprint);
  if (rank !== 0) return rank;
  const area = footprintAreaProxy(a.footprint) - footprintAreaProxy(b.footprint);
  if (area !== 0) return area; // smaller area = more specific
  return (b.specificityTieBreaker ?? 0) - (a.specificityTieBreaker ?? 0);
}

// ---------------------------------------------------------------------------
// The resolver (D0): packs override, field-level, most-specific first
// ---------------------------------------------------------------------------

/**
 * Curated layer first, computed base layer beneath it (D5/D8).
 *
 * Curated: field-level fall-through — the most specific pack that supplies a
 * field wins that field; an `excluded` row stops the chain for its crop. This
 * path is byte-identical to the curated-only resolver (with `catalog: {}` the
 * function behaves exactly as before — the golden gate depends on this).
 *
 * Computed fallback: a crop present in `input.catalog` that ends up with NO
 * curated timing (no pack row at all, or only prose-level rows) falls through
 * to `computedEvents`, resolved through the same anchored-event path, with
 * `origin: "computed"` and NO provenance — the absence of provenance is the
 * honesty marker (D8: computed is never dressed as curated). Two guards:
 *   - an `excluded` pack row hides the crop entirely (never falls through);
 *   - the crop-applicability filter skips entries whose `minFrostFreeDays`
 *     exceeds the site's frost-free season.
 */
export function resolveAll(site: SiteContext, input: ResolveInput): ResolvedCropCalendar[] {
  const applicable = input.packs
    .filter((p) => footprintContains(p.footprint, site.lat, site.lng))
    .sort(byPrecedence);

  // Gather each crop's override rows in precedence order.
  const rowsByCrop = new Map<string, PackCropOverride[]>();
  for (const pack of applicable) {
    for (const row of pack.crops) {
      const rows = rowsByCrop.get(row.crop) ?? [];
      rows.push(row);
      rowsByCrop.set(row.crop, rows);
    }
  }

  // Crops the curated layer settled — either by emitting a calendar or by an
  // `excluded` row. Neither may fall through to the computed layer.
  const settledByCurated = new Set<string>();

  const out: ResolvedCropCalendar[] = [];
  for (const [crop, rows] of rowsByCrop) {
    let timing: PackTiming | undefined;
    let timingRow: PackCropOverride | undefined;
    let excluded = false;

    for (const row of rows) {
      if (row.excluded) {
        // Most specific row excluding the crop hides it; a lower excluded row
        // just ends the fall-through chain. Either way the exclusion settles
        // the crop — it must not reappear as a computed estimate.
        if (row === rows[0]) excluded = true;
        settledByCurated.add(crop);
        break;
      }
      if (!timing && row.timing) {
        timing = row.timing;
        timingRow = row;
      }
    }

    if (excluded || !timing || !timingRow) continue;

    const { grid, windows } = resolveCropTiming(timing, site, input.catalog[crop]);
    settledByCurated.add(crop);
    out.push({
      crop,
      grid,
      ...(windows ? { windows } : {}),
      origin: "curated",
      provenance: timingRow.provenance,
    });
  }

  // Computed base layer: catalog crops the curated layer left unsettled.
  for (const crop of Object.keys(input.catalog)) {
    if (settledByCurated.has(crop)) continue;
    const entry = input.catalog[crop];
    if (!entry) continue;
    // Crop-applicability filter: the season must be long enough to finish.
    if (entry.minFrostFreeDays !== undefined && entry.minFrostFreeDays > site.frostFreeDays) {
      continue;
    }
    const events = computedEvents(entry);
    if (!events) continue; // perennial / no usable DTH — no honest estimate
    const windows = resolveAnchoredEvents(events, site, entry);
    out.push({
      crop,
      grid: bucketWindows(windows),
      windows,
      origin: "computed",
      // No provenance on purpose (D8) — computed is never dressed as curated.
    });
  }
  return out;
}
