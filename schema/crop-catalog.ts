// Global crop catalog (D3 + D4).
// Crop identity + structured days-to-maturity, keyed by stable slug. Timing and
// varieties do NOT live here — those are regional and belong to packs.
// This sample carries the two crops written out fully in the Piedmont pack, plus
// a couple of extras to show the range of hardiness classes.

import type { CropCatalog } from "./types";

export const CROP_CATALOG: CropCatalog = {
  tomato: {
    slug: "tomato",
    displayName: "Tomatoes",
    category: "vegetable",
    botanicalName: "Solanum lycopersicum",
    hardiness: "tender",
    spacingIn: "18",
    // Parsed from the legacy free text "T = 75-85, S = 125-135**".
    daysToMaturity: {
      transplant: [75, 85],
      direct: [125, 135],
      note: "Direct-seeding is impractical in most of the region; transplant is the norm.",
    },
    minFrostFreeDays: 90,
  },

  spinach: {
    slug: "spinach",
    displayName: "Spinach",
    category: "vegetable",
    botanicalName: "Spinacia oleracea",
    hardiness: "very-hardy",
    spacingIn: "6",
    daysToMaturity: { direct: [50, 60] },
    minFrostFreeDays: 55,
  },

  // --- extras for context (no full pack rows in this sample) ---
  "lettuce-leaf": {
    slug: "lettuce-leaf",
    displayName: "Lettuce, Leaf",
    category: "vegetable",
    botanicalName: "Lactuca sativa",
    hardiness: "half-hardy",
    spacingIn: "6",
    daysToMaturity: { direct: [40, 50], transplant: [15, 25] },
    minFrostFreeDays: 45,
  },

  garlic: {
    slug: "garlic",
    displayName: "Garlic",
    category: "vegetable",
    botanicalName: "Allium sativum",
    hardiness: "very-hardy",
    spacingIn: "4-6",
    daysToMaturity: { note: "Overwinters; harvested early-mid summer the following year." },
  },
};
