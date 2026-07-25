// Global crop catalog (D3 + D4).
// Crop identity + structured days-to-maturity, keyed by stable slug. Timing and
// varieties do NOT live here — those are regional and belong to packs.
//
// This is the FULL catalog: one entry per plant in data.js's PLANTS array (77),
// keyed by the loader's slugify(name). daysToMaturity is parsed from the legacy
// `daysToHarvest` free text; where the text could not be parsed into ranges the
// raw string is carried in `note` and NO numbers are invented.
//
// PROVISIONAL DATA NOTES
// - `category`: mapped mechanically from the legacy `type` ("vegetable"/
//   "flower"), except that obvious culinary herbs (basil, thyme, oregano, mint,
//   chives, cilantro, dill, parsley, rosemary, sage, lavender, chamomile) are
//   classified "herb" and true fruits (strawberries, blueberries, blackberries)
//   "fruit". Category refinement beyond the legacy `type` is provisional.
// - `hardiness`: provisional textbook horticultural classification, pending
//   regional review. It has not been validated against the Piedmont pack.
// - `daysToMaturity` method assignment: legacy strings labeled "T = " / "S = "
//   map to transplant/direct. Unlabeled single ranges are assigned to the
//   plant's dominant method in its legacy months grid (s/sg → direct, t/tg →
//   transplant); ambiguous cases carry the assumption in `note`. Unlabeled
//   two-range strings keep the FIRST range as primary (on the dominant method)
//   and preserve the second range in `note`. Trailing "**" footnotes are
//   stripped; data.js never defines them, so the note records their presence.
// - `minFrostFreeDays`: only for tender/half-hardy annuals where it follows
//   arithmetically from DTH — min(max direct DTH, max transplant DTH + ~30 for
//   the transplant lead). Omitted when unclear; never for perennials or
//   overwintered crops.

import type { CropCatalog } from "./types.ts";

export const CROP_CATALOG: CropCatalog = {
  arugula: {
    slug: "arugula",
    displayName: "Arugula",
    category: "vegetable",
    hardiness: "hardy",
    spacingIn: "6-9",
    daysToMaturity: { direct: [40, 50] },
  },

  "lettuce-head": {
    slug: "lettuce-head",
    displayName: "Lettuce, Head",
    category: "vegetable",
    hardiness: "half-hardy",
    spacingIn: "10",
    // "T = 45-60, S = 70-85"
    daysToMaturity: { transplant: [45, 60], direct: [70, 85] },
    minFrostFreeDays: 85,
  },

  radishes: {
    slug: "radishes",
    displayName: "Radishes",
    category: "vegetable",
    hardiness: "hardy",
    spacingIn: "1",
    daysToMaturity: { direct: [20, 25] },
  },

  "lettuce-leaf": {
    slug: "lettuce-leaf",
    displayName: "Lettuce, Leaf",
    category: "vegetable",
    botanicalName: "Lactuca sativa",
    hardiness: "half-hardy",
    spacingIn: "6",
    // "S = 40-50, T = 15-25"
    daysToMaturity: { direct: [40, 50], transplant: [15, 25] },
    minFrostFreeDays: 50,
  },

  "onions-green": {
    slug: "onions-green",
    displayName: "Onions, Green",
    category: "vegetable",
    hardiness: "very-hardy",
    spacingIn: "1-2",
    // "60-70, 42-56" — two unlabeled ranges; the legacy grid plants sets ("B").
    daysToMaturity: {
      direct: [60, 70],
      note:
        'Planted from sets ("B" in the legacy grid). Legacy lists a second unlabeled range, 42-56; the first range is kept as primary and treated as direct (assumption).',
    },
  },

  spinach: {
    slug: "spinach",
    displayName: "Spinach",
    category: "vegetable",
    botanicalName: "Spinacia oleracea",
    hardiness: "very-hardy",
    spacingIn: "6",
    daysToMaturity: { direct: [50, 60] },
  },

  celery: {
    slug: "celery",
    displayName: "Celery",
    category: "vegetable",
    hardiness: "half-hardy",
    spacingIn: "6-8",
    // "T = 40-70, S = 120-150**"
    daysToMaturity: {
      transplant: [40, 70],
      direct: [120, 150],
      note: 'Legacy direct-sow range carried a "**" footnote (not defined in data.js).',
    },
    minFrostFreeDays: 100,
  },

  "onions-bulb": {
    slug: "onions-bulb",
    displayName: "Onions, Bulb",
    category: "vegetable",
    hardiness: "very-hardy",
    spacingIn: "4",
    // "90-120" — single unlabeled range; grid shows both sowing and transplanting.
    daysToMaturity: {
      direct: [90, 120],
      note:
        "Single legacy range; the legacy grid shows both direct sowing and transplanting — assigned to direct sow (assumption).",
    },
  },

  leek: {
    slug: "leek",
    displayName: "Leek",
    category: "vegetable",
    hardiness: "very-hardy",
    spacingIn: "4",
    // "T = 50-80, S = 120-150"
    daysToMaturity: { transplant: [50, 80], direct: [120, 150] },
  },

  kale: {
    slug: "kale",
    displayName: "Kale",
    category: "vegetable",
    hardiness: "very-hardy",
    spacingIn: "6",
    // "14-22, 40-50" — two unlabeled ranges.
    daysToMaturity: {
      direct: [14, 22],
      note:
        "Legacy lists two unlabeled ranges (14-22, 40-50); the first is kept as primary on the dominant direct-sow method (assumption — plausibly a baby-leaf cut), the second preserved here: 40-50.",
    },
  },

  "collard-greens": {
    slug: "collard-greens",
    displayName: "Collard Greens",
    category: "vegetable",
    hardiness: "very-hardy",
    spacingIn: "18",
    // "T = 32-72, S = 60-100"
    daysToMaturity: { transplant: [32, 72], direct: [60, 100] },
  },

  "bok-choy": {
    slug: "bok-choy",
    displayName: "Bok Choy",
    category: "vegetable",
    hardiness: "hardy",
    spacingIn: "7-12",
    // "T = 30-75, S = 45-90**"
    daysToMaturity: {
      transplant: [30, 75],
      direct: [45, 90],
      note: 'Legacy direct-sow range carried a "**" footnote (not defined in data.js).',
    },
  },

  snapdragons: {
    slug: "snapdragons",
    displayName: "Snapdragons",
    category: "flower",
    hardiness: "half-hardy",
    spacingIn: "6-12",
    // "S = 60-90"
    daysToMaturity: { direct: [60, 90] },
    minFrostFreeDays: 90,
  },

  lavender: {
    slug: "lavender",
    displayName: "Lavender",
    category: "herb",
    hardiness: "perennial",
    spacingIn: "12-18",
    // "T = 90-120"
    daysToMaturity: { transplant: [90, 120] },
  },

  stock: {
    slug: "stock",
    displayName: "Stock",
    category: "flower",
    hardiness: "half-hardy",
    spacingIn: "8-12",
    // "S = 60-80"
    daysToMaturity: { direct: [60, 80] },
    minFrostFreeDays: 80,
  },

  chives: {
    slug: "chives",
    displayName: "Chives",
    category: "herb",
    hardiness: "perennial",
    spacingIn: "8",
    // "30-60" — grid shows only indoor sowing + transplanting.
    daysToMaturity: { transplant: [30, 60] },
  },

  "snap-pea-bush": {
    slug: "snap-pea-bush",
    displayName: "Snap Pea (Bush)",
    category: "vegetable",
    hardiness: "hardy",
    spacingIn: "2",
    daysToMaturity: { direct: [50, 55] },
  },

  "snap-pea-pole": {
    slug: "snap-pea-pole",
    displayName: "Snap Pea (Pole)",
    category: "vegetable",
    hardiness: "hardy",
    spacingIn: "6",
    daysToMaturity: { direct: [65, 70] },
  },

  "peas-vining": {
    slug: "peas-vining",
    displayName: "Peas, Vining",
    category: "vegetable",
    hardiness: "hardy",
    spacingIn: "2-3",
    daysToMaturity: { direct: [54, 72] },
  },

  "peas-bush": {
    slug: "peas-bush",
    displayName: "Peas, Bush",
    category: "vegetable",
    hardiness: "hardy",
    spacingIn: "4",
    daysToMaturity: { direct: [54, 60] },
  },

  mustard: {
    slug: "mustard",
    displayName: "Mustard",
    category: "vegetable",
    hardiness: "hardy",
    spacingIn: "2",
    daysToMaturity: { direct: [30, 40] },
  },

  parsley: {
    slug: "parsley",
    displayName: "Parsley",
    category: "herb",
    hardiness: "hardy",
    spacingIn: "9-12",
    // "T = 33, S = 75" — single values, not ranges.
    daysToMaturity: {
      transplant: [33, 33],
      direct: [75, 75],
      note: "Legacy gives single values (T = 33, S = 75), not ranges.",
    },
  },

  "chard-swiss": {
    slug: "chard-swiss",
    displayName: "Chard, Swiss",
    category: "vegetable",
    hardiness: "half-hardy",
    spacingIn: "6",
    // "60-70, 32-42" — two unlabeled ranges.
    daysToMaturity: {
      direct: [60, 70],
      note:
        "Legacy lists two unlabeled ranges (60-70, 32-42); the first is kept as primary on the dominant direct-sow method, the second preserved here: 32-42 (plausibly from transplant).",
    },
    minFrostFreeDays: 70,
  },

  carrots: {
    slug: "carrots",
    displayName: "Carrots",
    category: "vegetable",
    hardiness: "half-hardy",
    spacingIn: "2",
    daysToMaturity: { direct: [75, 80] },
    minFrostFreeDays: 80,
  },

  peppers: {
    slug: "peppers",
    displayName: "Peppers",
    category: "vegetable",
    hardiness: "tender",
    spacingIn: "18",
    // "T = 75-80, S = 145-150**"
    daysToMaturity: {
      transplant: [75, 80],
      direct: [145, 150],
      note: 'Legacy direct-sow range carried a "**" footnote (not defined in data.js).',
    },
    minFrostFreeDays: 110,
  },

  tomatoes: {
    slug: "tomatoes",
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
    minFrostFreeDays: 115,
  },

  "strawberries-bare-root": {
    slug: "strawberries-bare-root",
    displayName: "Strawberries (Bare-root)",
    category: "fruit",
    hardiness: "perennial",
    daysToMaturity: { note: "No days-to-harvest given in legacy data." },
  },

  "potatoes-irish": {
    slug: "potatoes-irish",
    displayName: "Potatoes (Irish)",
    category: "vegetable",
    hardiness: "half-hardy",
    daysToMaturity: { note: "No days-to-harvest given in legacy data." },
  },

  eggplant: {
    slug: "eggplant",
    displayName: "Eggplant",
    category: "vegetable",
    hardiness: "tender",
    spacingIn: "24",
    // "T = 90-95, S = 150-155**"
    daysToMaturity: {
      transplant: [90, 95],
      direct: [150, 155],
      note: 'Legacy direct-sow range carried a "**" footnote (not defined in data.js).',
    },
    minFrostFreeDays: 125,
  },

  calendula: {
    slug: "calendula",
    displayName: "Calendula",
    category: "flower",
    hardiness: "hardy",
    spacingIn: "8-12",
    // "S = 50-70"
    daysToMaturity: { direct: [50, 70] },
  },

  cabbage: {
    slug: "cabbage",
    displayName: "Cabbage",
    category: "vegetable",
    hardiness: "hardy",
    spacingIn: "12",
    // "63-75" — grid shows only indoor sowing + transplanting.
    daysToMaturity: { transplant: [63, 75] },
  },

  broccoli: {
    slug: "broccoli",
    displayName: "Broccoli",
    category: "vegetable",
    hardiness: "hardy",
    spacingIn: "18",
    // "T = 70-80"
    daysToMaturity: { transplant: [70, 80] },
  },

  cauliflower: {
    slug: "cauliflower",
    displayName: "Cauliflower",
    category: "vegetable",
    hardiness: "hardy",
    spacingIn: "18",
    // "T = 55-65, S = 85-95"
    daysToMaturity: { transplant: [55, 65], direct: [85, 95] },
  },

  yarrow: {
    slug: "yarrow",
    displayName: "Yarrow",
    category: "flower",
    hardiness: "perennial",
    daysToMaturity: { note: "No days-to-harvest given in legacy data." },
  },

  basil: {
    slug: "basil",
    displayName: "Basil",
    category: "herb",
    hardiness: "tender",
    spacingIn: "2-8",
    // "T = 14-35, S = 50-75"
    daysToMaturity: { transplant: [14, 35], direct: [50, 75] },
    minFrostFreeDays: 65,
  },

  kohlrabi: {
    slug: "kohlrabi",
    displayName: "Kohlrabi",
    category: "vegetable",
    hardiness: "hardy",
    spacingIn: "4",
    // "T = 22-32, S = 50-60"
    daysToMaturity: { transplant: [22, 32], direct: [50, 60] },
  },

  fennel: {
    slug: "fennel",
    displayName: "Fennel",
    category: "vegetable",
    hardiness: "half-hardy",
    spacingIn: "6-12",
    daysToMaturity: { direct: [60, 90] },
    minFrostFreeDays: 90,
  },

  cilantro: {
    slug: "cilantro",
    displayName: "Cilantro",
    category: "herb",
    hardiness: "hardy",
    spacingIn: "2-4",
    daysToMaturity: { direct: [50, 55] },
  },

  turnips: {
    slug: "turnips",
    displayName: "Turnips",
    category: "vegetable",
    hardiness: "hardy",
    spacingIn: "2",
    daysToMaturity: { direct: [55, 60] },
  },

  sage: {
    slug: "sage",
    displayName: "Sage",
    category: "herb",
    hardiness: "perennial",
    daysToMaturity: { note: "No days-to-harvest given in legacy data." },
  },

  marigolds: {
    slug: "marigolds",
    displayName: "Marigolds",
    category: "flower",
    hardiness: "tender",
    daysToMaturity: { note: "No days-to-harvest given in legacy data." },
  },

  echinacea: {
    slug: "echinacea",
    displayName: "Echinacea",
    category: "flower",
    hardiness: "perennial",
    daysToMaturity: { note: "No days-to-harvest given in legacy data." },
  },

  chamomile: {
    slug: "chamomile",
    displayName: "Chamomile",
    category: "herb",
    // German chamomile is grown as a cool-tolerant annual here (annual grid in
    // the legacy data); Roman chamomile would be perennial.
    hardiness: "hardy",
    // "S = 60-90"
    daysToMaturity: { direct: [60, 90] },
  },

  moonflower: {
    slug: "moonflower",
    displayName: "Moonflower",
    category: "flower",
    hardiness: "tender",
    // "S = 60-90"
    daysToMaturity: { direct: [60, 90] },
    minFrostFreeDays: 90,
  },

  parsnips: {
    slug: "parsnips",
    displayName: "Parsnips",
    category: "vegetable",
    hardiness: "hardy",
    spacingIn: "3-4",
    daysToMaturity: { direct: [100, 130] },
  },

  dill: {
    slug: "dill",
    displayName: "Dill",
    category: "herb",
    hardiness: "half-hardy",
    spacingIn: "2-4",
    daysToMaturity: { direct: [40, 55] },
    minFrostFreeDays: 55,
  },

  borage: {
    slug: "borage",
    displayName: "Borage",
    category: "flower",
    hardiness: "hardy",
    daysToMaturity: { note: "No days-to-harvest given in legacy data." },
  },

  beets: {
    slug: "beets",
    displayName: "Beets",
    category: "vegetable",
    hardiness: "hardy",
    spacingIn: "2",
    daysToMaturity: { direct: [55, 60] },
  },

  ginger: {
    slug: "ginger",
    displayName: "Ginger",
    category: "vegetable",
    hardiness: "tender",
    daysToMaturity: { note: "No days-to-harvest given in legacy data." },
  },

  "cabbage-chinese": {
    slug: "cabbage-chinese",
    displayName: "Cabbage (Chinese)",
    category: "vegetable",
    hardiness: "hardy",
    spacingIn: "12",
    // "T = 45-55, S = 75-85"
    daysToMaturity: { transplant: [45, 55], direct: [75, 85] },
  },

  sunflower: {
    slug: "sunflower",
    displayName: "Sunflower",
    category: "flower",
    hardiness: "half-hardy",
    spacingIn: "9-24",
    daysToMaturity: { direct: [55, 110] },
    minFrostFreeDays: 110,
  },

  "squash-summer": {
    slug: "squash-summer",
    displayName: "Squash (Summer)",
    category: "vegetable",
    hardiness: "tender",
    spacingIn: "24",
    // "T = 30-40, S = 50-60"
    daysToMaturity: { transplant: [30, 40], direct: [50, 60] },
    minFrostFreeDays: 60,
  },

  cucumbers: {
    slug: "cucumbers",
    displayName: "Cucumbers",
    category: "vegetable",
    hardiness: "tender",
    spacingIn: "12",
    // "T = 28-37, S = 56-65"
    daysToMaturity: { transplant: [28, 37], direct: [56, 65] },
    minFrostFreeDays: 65,
  },

  zinnias: {
    slug: "zinnias",
    displayName: "Zinnias",
    category: "flower",
    hardiness: "tender",
    daysToMaturity: { note: "No days-to-harvest given in legacy data." },
  },

  nasturtium: {
    slug: "nasturtium",
    displayName: "Nasturtium",
    category: "flower",
    // data.js's review note cites Clemson listing nasturtium as a hardy or
    // half-hardy annual; classified half-hardy here.
    hardiness: "half-hardy",
    daysToMaturity: { note: "No days-to-harvest given in legacy data." },
  },

  "corn-sweet": {
    slug: "corn-sweet",
    displayName: "Corn (Sweet)",
    category: "vegetable",
    hardiness: "tender",
    spacingIn: "12",
    daysToMaturity: { direct: [85, 90] },
    minFrostFreeDays: 90,
  },

  cantaloupe: {
    slug: "cantaloupe",
    displayName: "Cantaloupe",
    category: "vegetable",
    hardiness: "tender",
    spacingIn: "24",
    // "T = 57-62, S = 85-90"
    daysToMaturity: { transplant: [57, 62], direct: [85, 90] },
    minFrostFreeDays: 90,
  },

  "squash-winter": {
    slug: "squash-winter",
    displayName: "Squash (Winter)",
    category: "vegetable",
    hardiness: "tender",
    spacingIn: "36",
    // "T = 42-67, S = 70-95"
    daysToMaturity: { transplant: [42, 67], direct: [70, 95] },
    minFrostFreeDays: 95,
  },

  "potatoes-sweet": {
    slug: "potatoes-sweet",
    displayName: "Potatoes (Sweet)",
    category: "vegetable",
    hardiness: "tender",
    spacingIn: "10",
    // "T = 95-125" — planted as slips.
    daysToMaturity: {
      transplant: [95, 125],
      note: "Planted as slips; the legacy T range counts from setting slips out.",
    },
    // minFrostFreeDays omitted: the slip lead does not follow the ordinary
    // indoor-transplant arithmetic.
  },

  "peas-field": {
    slug: "peas-field",
    displayName: "Peas (Field)",
    category: "vegetable",
    // Southern/field peas (cowpeas) are a warm-season crop, unlike garden peas.
    hardiness: "tender",
    spacingIn: "4",
    daysToMaturity: { direct: [55, 65] },
    minFrostFreeDays: 65,
  },

  "lima-bean-pole": {
    slug: "lima-bean-pole",
    displayName: "Lima Bean (Pole)",
    category: "vegetable",
    hardiness: "tender",
    spacingIn: "6",
    daysToMaturity: { direct: [75, 95] },
    minFrostFreeDays: 95,
  },

  watermelon: {
    slug: "watermelon",
    displayName: "Watermelon",
    category: "vegetable",
    hardiness: "tender",
    spacingIn: "60",
    // "T = 62-72, S = 90-100"
    daysToMaturity: { transplant: [62, 72], direct: [90, 100] },
    minFrostFreeDays: 100,
  },

  okra: {
    slug: "okra",
    displayName: "Okra",
    category: "vegetable",
    hardiness: "tender",
    spacingIn: "12",
    // "T = 18-28, S = 60-70"
    daysToMaturity: { transplant: [18, 28], direct: [60, 70] },
    minFrostFreeDays: 58,
  },

  "lima-bean-bush": {
    slug: "lima-bean-bush",
    displayName: "Lima Bean (Bush)",
    category: "vegetable",
    hardiness: "tender",
    spacingIn: "6",
    daysToMaturity: { direct: [65, 80] },
    minFrostFreeDays: 80,
  },

  pumpkin: {
    slug: "pumpkin",
    displayName: "Pumpkin",
    category: "vegetable",
    hardiness: "tender",
    spacingIn: "48",
    daysToMaturity: { direct: [115, 120] },
    minFrostFreeDays: 120,
  },

  "brussels-sprouts": {
    slug: "brussels-sprouts",
    displayName: "Brussels Sprouts",
    category: "vegetable",
    hardiness: "hardy",
    spacingIn: "14-18",
    // "T = 40-50, S = 90-100**"
    daysToMaturity: {
      transplant: [40, 50],
      direct: [90, 100],
      note: 'Legacy direct-sow range carried a "**" footnote (not defined in data.js).',
    },
  },

  rutabaga: {
    slug: "rutabaga",
    displayName: "Rutabaga",
    category: "vegetable",
    hardiness: "hardy",
    spacingIn: "4",
    daysToMaturity: { direct: [70, 80] },
  },

  garlic: {
    slug: "garlic",
    displayName: "Garlic",
    category: "vegetable",
    botanicalName: "Allium sativum",
    hardiness: "very-hardy",
    spacingIn: "4-6",
    // Planted from cloves in fall, overwintered, harvested the next summer —
    // the flag keeps the computed rules from spring-planting it (Path A1).
    overwinter: true,
    // "B = 180-210" — days from planting cloves ("B" in the legacy grid).
    daysToMaturity: {
      direct: [180, 210],
      note:
        'Legacy "B = 180-210": days from planting cloves in fall. Overwinters; harvested early-mid summer the following year.',
    },
  },

  "beans-snap-bush": {
    slug: "beans-snap-bush",
    displayName: "Beans, Snap (Bush)",
    category: "vegetable",
    hardiness: "tender",
    spacingIn: "4-6",
    daysToMaturity: { direct: [50, 60] },
    minFrostFreeDays: 60,
  },

  "beans-snap-pole": {
    slug: "beans-snap-pole",
    displayName: "Beans, Snap (Pole)",
    category: "vegetable",
    hardiness: "tender",
    spacingIn: "6-8",
    daysToMaturity: { direct: [60, 70] },
    minFrostFreeDays: 70,
  },

  asparagus: {
    slug: "asparagus",
    displayName: "Asparagus",
    category: "vegetable",
    hardiness: "perennial",
    spacingIn: "12-18",
    daysToMaturity: { note: "Perennial; 2-3 years to full harvest" },
  },

  blueberries: {
    slug: "blueberries",
    displayName: "Blueberries",
    category: "fruit",
    hardiness: "perennial",
    spacingIn: "48-72",
    daysToMaturity: { note: "Perennial" },
  },

  blackberries: {
    slug: "blackberries",
    displayName: "Blackberries",
    category: "fruit",
    hardiness: "perennial",
    spacingIn: "36-48",
    daysToMaturity: { note: "Perennial" },
  },

  rosemary: {
    slug: "rosemary",
    displayName: "Rosemary",
    category: "herb",
    hardiness: "perennial",
    spacingIn: "18-24",
    daysToMaturity: { note: "Perennial" },
  },

  thyme: {
    slug: "thyme",
    displayName: "Thyme",
    category: "herb",
    hardiness: "perennial",
    spacingIn: "12-18",
    daysToMaturity: { note: "Perennial" },
  },

  oregano: {
    slug: "oregano",
    displayName: "Oregano",
    category: "herb",
    hardiness: "perennial",
    spacingIn: "12-18",
    daysToMaturity: { note: "Perennial" },
  },

  mint: {
    slug: "mint",
    displayName: "Mint",
    category: "herb",
    hardiness: "perennial",
    spacingIn: "12-18",
    daysToMaturity: { note: "Perennial" },
  },
};
