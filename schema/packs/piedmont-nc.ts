// Piedmont pack #1 — the reference regional override (D3/D5).
// Today's data.js re-expressed as anchor-relative events for two crops:
//   • tomato  — a tender, spring/warm-season crop anchored to lastFrost, with a
//     soil-temperature readiness gate and a derived harvest.
//   • spinach — a very-hardy crop with BOTH a spring run (forward from lastFrost)
//     AND a fall/overwinter run (backward from firstFrost), showing why timing
//     must be a list of anchored events, not one months-grid.
//
// Confidence scores, sources, and review notes are the real values from data.js
// (both crops score 5; both cite the NC State calendar, Piedmont guide, and NC
// State veg handbook). Rendering this pack at Carrboro's frost dates must
// reproduce today's calendar — that equality is the Phase-1 regression gate.

import type { RegionPack } from "../types";

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
    "Hand-reviewed override for the NC Piedmont (Carrboro reference point, on the 7b/8a line). The app's original dataset, re-expressed as anchor-relative events.",
  // Placeholder footprint ≈ the Piedmont ecoregion band across the Carolinas/GA.
  // Production would ship a simplified EPA Level-III ecoregion polygon (D5).
  footprint: { kind: "bbox", minLat: 33.6, minLng: -81.6, maxLat: 36.6, maxLng: -78.6 },
  specificity: 50,
  zones: ["7b", "8a"],
  sources: SOURCES,

  crops: [
    // -------------------------------------------------------------------
    // TOMATO — tender, warm-season; everything hangs off lastFrost.
    // Legacy grid: si Mar1–Apr1 · t Apr2–Jun2 (soil-temp gated) · h Jul1–Oct1
    // -------------------------------------------------------------------
    {
      crop: "tomato",
      provenance: {
        confidence: 5,
        sources: ["nc_state_calendar", "piedmont_guide", "nc_state_veg_handbook"],
        note: "Indoor-start plus outdoor-transplant schedule on the core spring-to-early-summer Central NC timing; greenhouse transplant flag and the late-summer second-planting carryover were removed as unsupported.",
      },
      varieties:
        "Cherokee Purple (heirloom, needs airflow — prone to cat-facing/cracking), Celebrity Plus, Mountain Magic/Fresh and Mountain Girl (disease-resilient for humid late-summer Piedmont). Grafting onto RST/DRO rootstock extends the season; keep the graft union above soil.",
      tips: "Deep-transplant (bury 2/3 of stem). Single-leader prune disease-prone heirlooms. Consistent water prevents cracking; add calcium.",
      events: [
        {
          id: "t-si",
          activity: "sowIndoors",
          anchor: { kind: "lastFrost" },
          offsetDays: [-45, -10], // ~6 to ~1.5 weeks before last frost
        },
        {
          id: "t-tp",
          activity: "transplant",
          anchor: { kind: "lastFrost" },
          offsetDays: [7, 70], // after frost through early summer
          gate: { kind: "soilTemp", depthIn: 4, thresholdF: 60, direction: "rising" },
          note: "Wait for 60°F soil at 4″ before setting out.",
        },
        {
          id: "t-h",
          activity: "harvest",
          fromEventId: "t-tp",
          method: "transplant", // uses daysToMaturity.transplant = [75, 85]
        },
      ],
    },

    // -------------------------------------------------------------------
    // SPINACH — very-hardy; spring run forward from lastFrost, fall/overwinter
    // run backward from firstFrost. Legacy grid smeared both into one row.
    // -------------------------------------------------------------------
    {
      crop: "spinach",
      provenance: {
        confidence: 5,
        sources: ["nc_state_calendar", "piedmont_guide", "nc_state_veg_handbook"],
        note: "Realistic cool-season row: broad May–June sowing dropped, mid-August establishment restart kept as heat-managed, explicit late-Oct/early-Nov outdoor sowing restored for overwinter intent alongside protected-culture support.",
      },
      tips: "Flavor sweetens after frost. Fall/overwinter is the stronger Piedmont window; the November sow is overwinter intent, not a same-fall harvest.",
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
      ],
    },
  ],
};
