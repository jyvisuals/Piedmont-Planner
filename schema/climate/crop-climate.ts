// Per-crop climate requirements (the Step-1 enrichment for the suitability model,
// docs/climate-suitability-model.md). LOCATION-INDEPENDENT by design: a tomato's
// temperature biology is the same in Carrboro, Seattle, or Phoenix, so this is a
// one-time GLOBAL dataset — the climate analog of the crop catalog's hardiness +
// days-to-maturity, kept in its own file so the golden crop-catalog stays byte-
// stable and the enrichment is reviewable on its own.
//
// It is bootstrapped exactly as the design doc proposes: start from the crop's
// existing `hardiness` class (which already encodes cold tolerance and warm/cool
// season), then layer crop-specific thresholds for the well-studied crops. Every
// number here is ESTIMATE-GRADE horticulture (°F), deliberately conservative;
// the suitability engine is validated against extension calendars, not these.
//
// Thresholds (all °F):
//   germMinF  — lowest daily-min at which outdoor germination/establishment is
//               reliable (the "wait for warm soil" gate for warm crops).
//   baseF     — growth base: below the daily MEAN there is little development.
//   optMinF   — lower edge of the comfortable growing band (mean temp).
//   optMaxF   — upper edge of the comfortable band (mean temp).
//   ceilingF  — heat-stress ceiling on the daily MAX: above it cool crops bolt
//               and warm-crop fruit set falters. The heat analog of the frost
//               line (docs/frost-free-locations.md).
//   frostKilled — true when a min ≤ 32°F ends the crop (tender/half-hardy annuals)
//               so its whole life-span must fit inside the frost-free season.
//   season    — "warm" crops flee the frost wall; "cool" crops flee the heat wall.

import type { CropCatalogEntry, CropSlug, Hardiness } from "../types.ts";

export interface CropClimate {
  germMinF: number;
  baseF: number;
  optMinF: number;
  optMaxF: number;
  ceilingF: number;
  frostKilled: boolean;
  season: "warm" | "cool";
  /**
   * Reproductive NIGHT-temperature limits for warm fruiting crops (°F, daily
   * min). Distinct from `ceilingF` (a daytime-max lethal/stress limit): fruit set
   * fails when flowering nights are too WARM (pollen sterility — tomatoes above
   * ~72°F, peppers above ~75°F) or, for peppers, too COOL (below ~60°F). Modeled
   * only over the flowering/fruiting stage, and only for crops that carry it —
   * this is why a warm-season crop can fail in midsummer with zero frost risk.
   */
  nightSetMaxF?: number;
  nightSetMinF?: number;
}

// Class defaults keyed off the catalog's existing hardiness — the bootstrap the
// design doc calls for (classify from hardiness, then refine per crop below).
const CLASS_DEFAULTS: Record<Hardiness, CropClimate | null> = {
  // germMinF is a daily-MEAN-temperature gate for reliable outdoor germination
  // (~11°F above the daily min), so cool-season values sit near 45–50°F, not the
  // soil-temperature floor — this keeps direct sowing out of mild-winter months.
  tender: { germMinF: 60, baseF: 50, optMinF: 65, optMaxF: 85, ceilingF: 95, frostKilled: true, season: "warm" },
  "half-hardy": { germMinF: 50, baseF: 40, optMinF: 55, optMaxF: 78, ceilingF: 88, frostKilled: true, season: "cool" },
  hardy: { germMinF: 45, baseF: 38, optMinF: 50, optMaxF: 75, ceilingF: 82, frostKilled: false, season: "cool" },
  "very-hardy": { germMinF: 42, baseF: 35, optMinF: 45, optMaxF: 72, ceilingF: 80, frostKilled: false, season: "cool" },
  // Perennials get no annual planting-suitability estimate (same rule the offset
  // engine uses — establishment schedules are not a generic guess).
  perennial: null,
};

// Crop-specific refinements for the well-studied crops (extension horticulture).
// Anything not listed uses its hardiness-class default above.
const CROP_OVERRIDES: Partial<Record<CropSlug, Partial<CropClimate>>> = {
  // Warm-season fruiting crops — germinate warm, set fruit poorly in extreme heat.
  // nightSet* captures reproductive night-temperature limits (pollen viability):
  // tomatoes abort fruit set above ~72°F nights; peppers above ~75°F and below
  // ~60°F. This is why they stall in midsummer despite no frost (Florida/AZ).
  tomatoes: { germMinF: 60, optMinF: 65, optMaxF: 85, ceilingF: 92, nightSetMaxF: 72 },
  peppers: { germMinF: 65, optMinF: 70, optMaxF: 88, ceilingF: 95, nightSetMaxF: 75, nightSetMinF: 58 },
  eggplant: { germMinF: 65, optMinF: 70, optMaxF: 90, ceilingF: 98, nightSetMaxF: 75 },
  cucumbers: { germMinF: 60, optMinF: 65, optMaxF: 90, ceilingF: 95 },
  "squash-summer": { germMinF: 60, optMaxF: 90, ceilingF: 95 },
  "squash-winter": { germMinF: 60, optMaxF: 90, ceilingF: 95 },
  pumpkin: { germMinF: 60, optMaxF: 90, ceilingF: 95 },
  cantaloupe: { germMinF: 65, optMinF: 70, optMaxF: 92, ceilingF: 100 },
  watermelon: { germMinF: 65, optMinF: 70, optMaxF: 92, ceilingF: 100 },
  // True heat-lovers — high ceilings, thrive where others bolt.
  okra: { germMinF: 70, optMinF: 75, optMaxF: 95, ceilingF: 104 },
  "potatoes-sweet": { germMinF: 65, optMinF: 70, optMaxF: 95, ceilingF: 100 },
  "peas-field": { germMinF: 65, optMinF: 70, optMaxF: 92, ceilingF: 100 },
  "lima-bean-bush": { germMinF: 65, optMinF: 70, optMaxF: 90, ceilingF: 98 },
  "lima-bean-pole": { germMinF: 65, optMinF: 70, optMaxF: 90, ceilingF: 98 },
  "corn-sweet": { germMinF: 55, optMinF: 65, optMaxF: 90, ceilingF: 95 },
  basil: { germMinF: 60, optMinF: 65, optMaxF: 90, ceilingF: 95 },
  // Cool-season crops that bolt readily — low ceilings are the point.
  lettuce: { ceilingF: 80 },
  "lettuce-head": { ceilingF: 78 },
  "lettuce-leaf": { ceilingF: 80 },
  spinach: { ceilingF: 75 },
  arugula: { ceilingF: 78 },
  cilantro: { ceilingF: 78 },
  peas: { ceilingF: 80 },
  "snap-pea-bush": { ceilingF: 80 },
  "snap-pea-pole": { ceilingF: 80 },
  "peas-vining": { ceilingF: 80 },
  "peas-bush": { ceilingF: 80 },
  radishes: { ceilingF: 80 },
  broccoli: { ceilingF: 82 },
  cauliflower: { ceilingF: 82 },
  cabbage: { ceilingF: 82 },
  kale: { ceilingF: 85 },
  "collard-greens": { ceilingF: 88 },
  // Cool but potato-family: irish potatoes stop tuberizing in heat.
  "potatoes-irish": { germMinF: 45, optMinF: 50, optMaxF: 72, ceilingF: 82 },
};

/**
 * The climate requirements for a catalog entry, or null when no honest estimate
 * exists (perennials). Merges the crop-specific override over the hardiness-class
 * default — the same additive layering the offset rules use.
 */
export function climateFor(entry: CropCatalogEntry): CropClimate | null {
  const base = CLASS_DEFAULTS[entry.hardiness];
  if (!base) return null;
  const over = CROP_OVERRIDES[entry.slug];
  return over ? { ...base, ...over } : base;
}
