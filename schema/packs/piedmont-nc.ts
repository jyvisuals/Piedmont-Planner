// Piedmont pack #1 — the reference regional override (D3/D5).
// Demonstrates BOTH kinds of pack timing:
//   • tomato  — VERBATIM: the reviewed half-month grid carried byte-for-byte
//     from data.js. This is the migration default for curated data — zero-loss,
//     no grid→offset inversion, and the "Carrboro must not move" regression
//     gate holds by construction.
//   • spinach — ANCHORED: day-resolution events, with a spring run counting
//     forward from lastFrost AND a fall/overwinter run counting backward from
//     firstFrost — the case a single months-grid structurally smears together.
//
// Confidence scores, sources, and review notes are the real values from data.js
// (both crops score 5; both cite the NC State calendar, Piedmont guide, and NC
// State veg handbook).

import type { RegionPack } from "../types.ts";

const SOURCES = {
  nc_state_calendar: {
    label: "NC State Central NC Planting Calendar",
    url: "https://content.ces.ncsu.edu/central-north-carolina-planting-calendar-for-annual-vegetables-fruits-and-herbs",
  },
  piedmont_guide: {
    label: "NC State Growing Small Farms — Piedmont Planting Guide",
    url: "https://growingsmallfarms.ces.ncsu.edu/growingsmallfarms-plantingguide/",
  },
  nc_state_veg_handbook: {
    label: "NC State Extension Gardener Handbook — Vegetable Gardening",
    url: "https://content.ces.ncsu.edu/extension-gardener-handbook/16-vegetable-gardening",
  },
};

export const PIEDMONT_NC: RegionPack = {
  schemaVersion: 1,
  id: "piedmont-nc",
  name: "North Carolina Piedmont",
  description:
    "Hand-reviewed override for the NC Piedmont (Carrboro reference point, on the 7b/8a line). Sample rows demonstrating verbatim and anchored timing; the full pack is derived from data.js by the legacy loader.",
  // Placeholder footprint ≈ the Piedmont ecoregion band across the Carolinas/GA.
  // Production would ship a simplified EPA Level-III ecoregion polygon (D5).
  footprint: { kind: "bbox", minLat: 33.6, minLng: -81.6, maxLat: 36.6, maxLng: -78.6 },
  zones: ["7b", "8a"],
  sources: SOURCES,

  crops: [
    // -------------------------------------------------------------------
    // TOMATO — VERBATIM timing: the reviewed data.js grid, carried unchanged.
    // The curated row IS the deliverable; no offsets are inferred from it.
    // -------------------------------------------------------------------
    {
      crop: "tomatoes",
      provenance: {
        confidence: 5,
        sources: ["nc_state_calendar", "piedmont_guide", "nc_state_veg_handbook"],
        note: "Indoor-start plus outdoor-transplant schedule on the core spring-to-early-summer Central NC timing; greenhouse transplant flag and the late-summer second-planting carryover were removed as unsupported.",
      },
      varieties:
        "Cherokee Purple (heirloom, needs airflow — prone to cat-facing/cracking), Celebrity Plus, Mountain Magic/Fresh and Mountain Girl (disease-resilient for humid late-summer Piedmont). Grafting onto RST/DRO rootstock extends the season; keep the graft union above soil.",
      tips: "Deep-transplant (bury 2/3 of stem). Single-leader prune disease-prone heirlooms. Consistent water prevents cracking; add calcium. Wait for 60°F soil at 4″ before setting out.",
      timing: {
        kind: "verbatim",
        grid: {
          jan: { half1: [], half2: [] },
          feb: { half1: [], half2: [] },
          mar: { half1: ["si"], half2: ["si"] },
          apr: { half1: ["si"], half2: ["t"] },
          may: { half1: ["t"], half2: ["t"] },
          jun: { half1: ["t"], half2: ["t"] },
          jul: { half1: ["h"], half2: ["h"] },
          aug: { half1: ["h"], half2: ["h"] },
          sep: { half1: ["h"], half2: ["h"] },
          oct: { half1: ["h"], half2: [] },
          nov: { half1: [], half2: [] },
          dec: { half1: [], half2: [] },
        },
      },
    },

    // -------------------------------------------------------------------
    // SPINACH — ANCHORED timing: spring run forward from lastFrost,
    // fall/overwinter run backward from firstFrost. Legacy grid smeared both
    // into one row; the event list keeps the two seasons distinct. Note the
    // overwinter sowing's derived harvest lands in the NEXT calendar year —
    // resolved windows live on the unbounded SeasonDay axis (may exceed 366).
    // -------------------------------------------------------------------
    {
      crop: "spinach",
      provenance: {
        confidence: 5,
        sources: ["nc_state_calendar", "piedmont_guide", "nc_state_veg_handbook"],
        note: "Realistic cool-season row: broad May–June sowing dropped, mid-August establishment restart kept as heat-managed, explicit late-Oct/early-Nov outdoor sowing restored for overwinter intent alongside protected-culture support.",
      },
      tips: "Flavor sweetens after frost. Fall/overwinter is the stronger Piedmont window; the November sow is overwinter intent, not a same-fall harvest.",
      timing: {
        kind: "anchored",
        events: [
        // --- spring run (forward from lastFrost) ---
        {
          id: "s-sg-spring",
          activity: "sowGreenhouse",
          anchor: { kind: "lastFrost" },
          offsetDays: [-70, -49], // protected late-winter start
          special: true,
        },
        {
          id: "s-sow-spring",
          activity: "sowOutdoors",
          anchor: { kind: "lastFrost" },
          offsetDays: [-45, 0],
        },
        {
          id: "s-h-spring",
          activity: "harvest",
          fromEventId: "s-sow-spring",
          method: "direct", // daysToMaturity.direct = [50, 60]
        },

        // --- fall / overwinter run (backward from firstFrost) ---
        {
          id: "s-sow-fall-estab",
          activity: "sowOutdoors",
          anchor: { kind: "firstFrost" },
          offsetDays: [-75, -60], // mid-August establishment restart
          special: true,
          note: "Heat-managed germination — shade/moisture for hot-soil establishment.",
        },
        {
          id: "s-sow-fall-main",
          activity: "sowOutdoors",
          anchor: { kind: "firstFrost" },
          offsetDays: [-56, -14], // main Sept–Oct fall sowing
        },
        {
          id: "s-sg-fall",
          activity: "sowGreenhouse",
          anchor: { kind: "firstFrost" },
          offsetDays: [-14, 7], // protected late-fall shoulder
          special: true,
        },
        {
          id: "s-sow-overwinter",
          activity: "sowOutdoors",
          anchor: { kind: "firstFrost" },
          offsetDays: [0, 14],
          special: true,
          note: "Overwinter intent: below ~10 h day length growth stalls (Persephone period); harvest resumes late winter.",
        },
        {
          id: "s-h-fall",
          activity: "harvest",
          fromEventId: "s-sow-fall-main",
          method: "direct",
          note: "Sweetest after hard frost; picking runs into winter under cover.",
        },
        {
          id: "s-h-overwinter",
          activity: "harvest",
          fromEventId: "s-sow-overwinter",
          method: "direct",
          note: "Overwinter harvest crosses the year boundary (SeasonDay > 365).",
        },
        ],
      },
    },
  ],
};
