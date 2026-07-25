// Piedmont Planner — multi-pack data contracts (spec)
// =====================================================
// This file makes decisions D1–D5 (see docs/architecture-decisions.md) concrete
// as TypeScript. It is the *contract layer*: packs, the crop catalog, and the
// offset engine all conform to these types, and a pack that violates the schema
// fails to compile (D9). Nothing here is wired into the live app yet — it is the
// spec you build the engine and future packs against.

// ---------------------------------------------------------------------------
// D1 — Anchor vocabulary (the currency of the whole system)
// ---------------------------------------------------------------------------
// Every timing rule is an offset from one of these anchors. The SET of anchor
// kinds and their exact meaning is the deepest one-way door: add kinds freely
// later, but never redefine an existing one.

/** NCEI freeze-date temperature thresholds, °F. */
export type FrostThresholdF = 36 | 32 | 28 | 24 | 20 | 16;

/** NCEI freeze-date exceedance probabilities, %. */
export type FrostProbabilityPct = 90 | 80 | 70 | 60 | 50 | 40 | 30 | 20 | 10;

/**
 * Which frost line a spring/fall anchor resolves against. Pinned defaults live
 * in DEFAULT_FROST_REF; stored as a parameter (never a bare scalar) so the
 * reference can shift without a schema break, and so the UI can surface the
 * probability spread NCEI actually provides (D1, D8).
 */
export interface FrostAnchorRef {
  thresholdF: FrostThresholdF;
  probabilityPct: FrostProbabilityPct;
}

export const DEFAULT_FROST_REF: FrostAnchorRef = {
  thresholdF: 32,
  probabilityPct: 50,
};

/** An anchor reference used inside a timing event. Discriminated by `kind`. */
export type AnchorRef =
  | { kind: "lastFrost"; ref?: Partial<FrostAnchorRef> } // average last spring freeze
  | { kind: "firstFrost"; ref?: Partial<FrostAnchorRef> } // average first fall freeze
  | { kind: "soilTemp"; depthIn: number; thresholdF: number; direction: "rising" | "falling" }
  | { kind: "photoperiod"; hours: number; direction: "lengthening" | "shortening" }
  | { kind: "gddAccum"; baseF: number; sum: number }
  | { kind: "calendarDate"; month: number; day: number }; // escape hatch — truly date-fixed

// ---------------------------------------------------------------------------
// D2 — Canonical timing: day-resolution anchored EVENTS (half-months are render-only)
// ---------------------------------------------------------------------------
// A crop's timing is a LIST of events, not a single months-grid. Offsets are in
// days. Many crops have multiple plantings anchored differently (spring counts
// forward from lastFrost; fall counts backward from firstFrost) — the list makes
// that explicit instead of smearing it across a grid.

/** The app's legend codes, as a typed union. */
export type Activity =
  | "sowIndoors" // si
  | "sowOutdoors" // s
  | "sowGreenhouse" // sg  (unheated protected culture)
  | "transplant" // t
  | "transplantGreenhouse" // tg
  | "plantSet" // B   (bulbs / cloves / sets)
  | "harvest"; // h

/** Inclusive day-offset window relative to an anchor. Negative = before. */
export type OffsetDays = readonly [earliest: number, latest: number];

/** A planting/maintenance action tied to an anchor. */
export interface AnchoredEvent {
  /** Stable within the crop's event list; lets a derived harvest reference it. */
  id: string;
  activity: Exclude<Activity, "harvest">;
  anchor: AnchorRef;
  offsetDays: OffsetDays;
  /** Optional readiness gate that must ALSO hold, e.g. soil ≥ 60°F @ 4″. */
  gate?: AnchorRef;
  /** The app's `*`: heat-managed germination, overwinter intent, etc. */
  special?: boolean;
  note?: string;
}

/** Harvest derived from a planting event + the crop's structured days-to-maturity. */
export interface DerivedHarvest {
  id: string;
  activity: "harvest";
  /** Which planting event this harvest follows (AnchoredEvent.id). */
  fromEventId: string;
  /** Which days-to-maturity range on the catalog entry to use. */
  method: "direct" | "transplant";
  note?: string;
}

export type TimingEvent = AnchoredEvent | DerivedHarvest;

// ---------------------------------------------------------------------------
// D2b — Verbatim half-month grids (curated packs may skip anchoring entirely)
// ---------------------------------------------------------------------------
// A curated pack's timing is region-locked by definition, so it does not need
// portable anchor rules. Carrying the reviewed half-month grid VERBATIM keeps
// hand-tuned data zero-loss (no lossy grid→offset inversion), makes the
// "Carrboro must not move" regression gate true by construction, and matches
// how Extension calendars are actually published (date tables, not offsets).
// Anchored events remain available for packs that want day precision; the
// computed layer always uses them.

/** The app's legacy single-letter codes, exactly as stored in data.js today. */
export type HalfMonthCode = "s" | "si" | "sg" | "t" | "tg" | "B" | "h" | "*";

export type MonthId =
  | "jan" | "feb" | "mar" | "apr" | "may" | "jun"
  | "jul" | "aug" | "sep" | "oct" | "nov" | "dec";

export interface HalfMonthCells {
  half1: HalfMonthCode[];
  half2: HalfMonthCode[];
}

/** The 24-slot grid, byte-compatible with a data.js `months` object. */
export type HalfMonthGrid = Record<MonthId, HalfMonthCells>;

/**
 * How a pack expresses a crop's timing. `verbatim` is the migration default
 * for curated data; `anchored` opts into day precision.
 */
export type PackTiming =
  | { kind: "verbatim"; grid: HalfMonthGrid }
  | { kind: "anchored"; events: TimingEvent[] };

// ---------------------------------------------------------------------------
// D3 + D4 — Global crop catalog: stable slugs + structured days-to-maturity
// ---------------------------------------------------------------------------
// Crop identity lives here, keyed by a stable slug (never a per-file ordinal).
// Packs and computed rows reference crops by slug so they can merge/override.
// Varieties/cultivars do NOT live here — they're regional and stay in packs.

/** Stable, human-readable identifier, e.g. "tomato", "pea-snap-pole". */
export type CropSlug = string;

export type CropCategory = "vegetable" | "herb" | "fruit" | "flower";

/**
 * Frost relationship — drives both the applicability filter and which anchor a
 * crop's plantings naturally hang off.
 */
export type Hardiness = "tender" | "half-hardy" | "hardy" | "very-hardy" | "perennial";

/** Structured DTH (replaces free text like "T = 75-85, S = 125-135**"). */
export interface DaysToMaturity {
  /** Days from direct sow to first harvest. */
  direct?: readonly [number, number];
  /** Days from transplant to first harvest. */
  transplant?: readonly [number, number];
  note?: string;
}

export interface CropCatalogEntry {
  slug: CropSlug;
  displayName: string;
  category: CropCategory;
  botanicalName?: string;
  hardiness: Hardiness;
  /** Typical in-row spacing, inches (kept as a range string; display-only). */
  spacingIn?: string;
  daysToMaturity: DaysToMaturity;
  /** Minimum frost-free days to finish; powers the crop-applicability filter. */
  minFrostFreeDays?: number;
}

export type CropCatalog = Record<CropSlug, CropCatalogEntry>;

// ---------------------------------------------------------------------------
// D8 — Provenance & confidence (mandatory on every overriding row)
// ---------------------------------------------------------------------------

export interface SourceRef {
  label: string;
  url: string;
}

/** 0–5, matching the app's existing PLANT_REVIEW_CONFIDENCE rubric. */
export type Confidence = 0 | 1 | 2 | 3 | 4 | 5;

export interface Provenance {
  confidence: Confidence;
  /** Ids into the pack's own `sources` map. */
  sources: string[];
  /** The review-note rationale (why this diverges / how it was derived). */
  note?: string;
}

// ---------------------------------------------------------------------------
// D5 — Pack schema, footprint geometry, and precedence
// ---------------------------------------------------------------------------

/**
 * Where the pack's data was actually validated — usually a single town/garden
 * (D8 honesty-by-distance: the UI shows "curated at <label>, N km from you").
 * Distinct from `footprint`, which is where the pack is *applied*.
 */
export interface ReferencePoint {
  lat: number;
  lng: number;
  label?: string; // e.g. "Carrboro, NC"
}

/**
 * Region-scoped content beyond crop rows — the chore calendar and the
 * greenhouse-confidence subsystem from the legacy dataset (see the
 * transition-cost ledger in docs/architecture-decisions.md). Carried verbatim
 * and rendered as-is; nothing here feeds the timing engine.
 */
export interface RegionalContent {
  /** Month-by-month chore list, split into half-months. */
  tasks?: Record<MonthId, { half1: string; half2: string }>;
  greenhouse?: {
    /** The pack's protected-culture policy prose/structure, verbatim. */
    rules?: Record<string, unknown>;
    /** Per-crop protected-culture confidence, keyed by CropSlug. */
    cropConfidence?: Record<CropSlug, { level: string; note?: string }>;
    /** Per-crop rule category, keyed by CropSlug. */
    cropRuleCategory?: Record<CropSlug, string>;
  };
  /** What each confidence score means, keyed by score ("0".."5"). */
  confidenceRubric?: Record<string, string>;
}

/** Where a pack applies. The resolver does point-in-polygon / membership. */
export type Footprint =
  | { kind: "bbox"; minLat: number; minLng: number; maxLat: number; maxLng: number }
  | { kind: "polygon"; ring: ReadonlyArray<readonly [lng: number, lat: number]> }
  | { kind: "counties"; fips: string[] };

/**
 * One crop's override within a pack. Three intents are distinguishable:
 *   - override timing  → `timing` present (verbatim grid or anchored events)
 *   - inherit computed → `timing` omitted (may still override prose/varieties)
 *   - exclude here      → `excluded: true` (crop hidden for this region)
 * Field-level: `varieties`/`tips` override independently of `timing` (D5).
 */
export interface PackCropOverride {
  crop: CropSlug;
  timing?: PackTiming;
  varieties?: string;
  tips?: string;
  excluded?: boolean;
  /** Mandatory whenever this row overrides anything (D5/D8). */
  provenance: Provenance;
}

export interface RegionPack {
  /** Bump when the contract changes; lets the resolver evolve (D5). */
  schemaVersion: 1;
  id: string; // e.g. "piedmont-nc"
  name: string;
  description?: string;
  footprint: Footprint;
  /**
   * Precedence when footprints overlap is DERIVED from the footprint itself —
   * counties > polygon > bbox, then smaller area wins — so contributors cannot
   * collide by all picking the same magic number. This optional field is a
   * tie-breaker only (higher wins), not the primary key (D5).
   */
  specificityTieBreaker?: number;
  /** Informational only — NOT the resolution key. Zone alone is too coarse (D5/D7). */
  zones?: string[];
  /** Where the data was validated (honesty-by-distance in the UI, D8). */
  referencePoint?: ReferencePoint;
  /** Pack-local source library, referenced by Provenance.sources. */
  sources: Record<string, SourceRef>;
  crops: PackCropOverride[];
  /** Region-scoped extras: chore calendar, greenhouse policy (render-only). */
  regional?: RegionalContent;
}

// ---------------------------------------------------------------------------
// D0 / D6 / D7 — The seams: location, data providers, and the resolver
// ---------------------------------------------------------------------------
// Declared as interfaces (no implementations here). Locking these signatures is
// the reversibility hedge: any provider can move from a static-JSON client impl
// to a serverless proxy without touching the engine, resolver, or UI.
//
// Layering rule: providers are the ASYNC acquisition layer (every method
// returns a Promise, so static-JSON and network impls are interchangeable);
// they assemble a SiteContext, which is PLAIN SERIALIZABLE DATA (no functions)
// so it can be cached in localStorage for offline PWA use and snapshotted as a
// test fixture; the engine/resolver is pure and synchronous over that context.

/** 1–366: an anchor date within the calendar year. */
export type DayOfYear = number;

/**
 * The unbounded day axis timing math runs on: days since Jan 1 of the plan
 * year, allowed to exceed 366. Cross-year crops need this — garlic planted in
 * October (~day 290) is harvested the following June (~day 520), and an
 * overwinter sowing's derived harvest lands in the next calendar year.
 * Normalize modulo the year ONLY at render time; never do modular interval
 * arithmetic mid-computation.
 */
export type SeasonDay = number;

/** Typed key into the frost table: `${thresholdF}/${probabilityPct}`. */
export type FrostKey = `${FrostThresholdF}/${FrostProbabilityPct}`;

export interface SoilSummary {
  textureClass: string; // e.g. "clay", "sandy loam"
  drainageClass: string; // e.g. "poorly drained"
  ph?: number;
}

/**
 * D7 — lat/lng is canonical; ZIP is merely one way to obtain it.
 * Plain data by design: assembled once by providers, cached, fed to the engine.
 */
export interface SiteContext {
  lat: number;
  lng: number;
  zone: string; // USDA hardiness zone, e.g. "8a"
  frostFreeDays: number;
  /** Resolved frost-date table; the engine looks anchors up by FrostKey. */
  frost: {
    lastFrost: Partial<Record<FrostKey, DayOfYear>>;
    firstFrost: Partial<Record<FrostKey, DayOfYear>>;
    /** Nearest-station identity, for honest sourcing in the UI (D8). */
    station: { id: string; distanceKm: number };
  };
  soil?: SoilSummary;
  /** Dataset versions that produced this context — pinned per D8. */
  datasetVersions: Record<string, string>; // e.g. { ncei: "1991-2020", phz: "2023" }
}

export interface FrostProvider {
  frostTable(lat: number, lng: number): Promise<SiteContext["frost"]>;
}

export interface ZoneProvider {
  zone(lat: number, lng: number): Promise<string>;
}

export interface SoilProvider {
  soil(lat: number, lng: number): Promise<SoilSummary>;
}

export interface WeatherProvider {
  soilTempCrossing(
    lat: number,
    lng: number,
    depthIn: number,
    thresholdF: number
  ): Promise<DayOfYear | null>;
  activeFrostAlert(lat: number, lng: number): Promise<boolean>;
}

/** A resolved timing window on the season-day axis, pre-bucketing. */
export interface ResolvedWindow {
  activity: Activity;
  start: SeasonDay;
  end: SeasonDay; // >= start; may exceed 366 (wraps into the next year at render)
  special?: boolean;
  gated?: boolean;
  note?: string;
}

export interface ResolvedCropCalendar {
  crop: CropSlug;
  /**
   * The UI currency — always present. Verbatim curated timing passes through
   * unchanged; anchored/computed timing is bucketed into it by the engine.
   */
  grid: HalfMonthGrid;
  /** Day-precision windows, present only when timing was anchored/computed. */
  windows?: ResolvedWindow[];
  /** "curated" when a pack supplied timing; "computed" otherwise (D8 — never blurred). */
  origin: "curated" | "computed";
  provenance?: Provenance;
}

export interface ResolveInput {
  catalog: CropCatalog;
  packs: RegionPack[];
}

/** The pure, testable core (D0). Implemented elsewhere; signature pinned here. */
export interface Resolver {
  resolve(site: SiteContext, input: ResolveInput): ResolvedCropCalendar[];
}

// ---------------------------------------------------------------------------
// D10 — Personal overlays & accounts (local-first; login is additive)
// ---------------------------------------------------------------------------
// A user's customization is just a RegionPack with a tiny (coarse!) footprint
// at highest precedence — validated by validateRegionPack, resolved by the
// normal resolver. This seam is the only accounts-facing contract: swap the
// localStorage implementation for a remote per-user store (e.g. Supabase with
// row-level security) without touching engine, resolver, or UI. The store
// never interprets the overlay; clients validate on save AND on load.
// Privacy pin: footprints stored here are coarse (ZIP-centroid); precise
// coordinates never leave the device unless the user explicitly shares.

export interface OverlayStore {
  /** The user's overlay pack, or null if none exists yet. */
  load(): Promise<RegionPack | null>;
  save(overlay: RegionPack): Promise<void>;
  clear(): Promise<void>;
}
