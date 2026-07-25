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

/** Where a pack applies. The resolver does point-in-polygon / membership. */
export type Footprint =
  | { kind: "bbox"; minLat: number; minLng: number; maxLat: number; maxLng: number }
  | { kind: "polygon"; ring: ReadonlyArray<readonly [lng: number, lat: number]> }
  | { kind: "counties"; fips: string[] };

/**
 * One crop's override within a pack. Three intents are distinguishable:
 *   - override timing  → `events` present
 *   - inherit computed → `events` omitted (may still override prose/varieties)
 *   - exclude here      → `excluded: true` (crop hidden for this region)
 * Field-level: `varieties`/`tips` override independently of `events` (D5).
 */
export interface PackCropOverride {
  crop: CropSlug;
  events?: TimingEvent[];
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
  /** Most-specific footprint wins when packs overlap; higher = wins (D5). */
  specificity: number;
  /** Informational only — NOT the resolution key. Zone alone is too coarse (D5/D7). */
  zones?: string[];
  /** Pack-local source library, referenced by Provenance.sources. */
  sources: Record<string, SourceRef>;
  crops: PackCropOverride[];
}

// ---------------------------------------------------------------------------
// D0 / D6 / D7 — The seams: location, data providers, and the resolver
// ---------------------------------------------------------------------------
// Declared as interfaces (no implementations here). Locking these signatures is
// the reversibility hedge: any provider can move from a static-JSON client impl
// to a serverless proxy without touching the engine, resolver, or UI.

/** 1–366. */
export type DayOfYear = number;

export interface SoilSummary {
  textureClass: string; // e.g. "clay", "sandy loam"
  drainageClass: string; // e.g. "poorly drained"
  ph?: number;
}

/** D7 — lat/lng is canonical; ZIP is merely one way to obtain it. */
export interface SiteContext {
  lat: number;
  lng: number;
  zone: string; // USDA hardiness zone, e.g. "8a"
  frostFreeDays: number;
  /** Resolved anchor dates for this site (provider-backed). */
  lastFrost: (ref?: Partial<FrostAnchorRef>) => DayOfYear;
  firstFrost: (ref?: Partial<FrostAnchorRef>) => DayOfYear;
  soil?: SoilSummary;
}

export interface FrostProvider {
  lastFrost(lat: number, lng: number, ref: FrostAnchorRef): DayOfYear;
  firstFrost(lat: number, lng: number, ref: FrostAnchorRef): DayOfYear;
  /** Nearest station id + distance, for honest sourcing in the UI (D8). */
  station(lat: number, lng: number): { id: string; distanceKm: number };
}

export interface ZoneProvider {
  zone(lat: number, lng: number): string;
}

export interface SoilProvider {
  soil(lat: number, lng: number): Promise<SoilSummary>;
}

export interface WeatherProvider {
  soilTempCrossing(lat: number, lng: number, depthIn: number, thresholdF: number): DayOfYear | null;
  activeFrostAlert(lat: number, lng: number): boolean;
}

/** A resolved timing window, in day-of-year, ready to bucket into half-months. */
export interface ResolvedWindow {
  activity: Activity;
  start: DayOfYear;
  end: DayOfYear;
  special?: boolean;
  gated?: boolean;
  note?: string;
}

export interface ResolvedCropCalendar {
  crop: CropSlug;
  windows: ResolvedWindow[];
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
