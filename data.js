// Planting Calendar Data
// Zone 8a - Piedmont Region
//
// Data model:
// - Each crop has a `months` object with `half1` and `half2` arrays for each month.
// - `half1` means the first half of the month; `half2` means the second half.
// - Multiple codes in one half-month mean multiple actions are reasonable in that slot.
//
// Timing codes:
// - `s`  = sow/direct-seed outdoors
// - `si` = sow indoors in trays/soil blocks for later transplanting
// - `sg` = sow in protected culture such as an unheated greenhouse, cold frame, or similar cover
// - `t`  = transplant outdoors
// - `tg` = transplant into protected culture such as an unheated greenhouse or cold frame
// - `B`  = plant bulbs, cloves, or sets
// - `h`  = harvest
// - `*`  = special handling
//
// Derivation notes:
// - This file is the Carrboro/Piedmont review dataset and the app's only dataset.
// - `s` and `t` were reviewed primarily against the NC State Central NC planting calendar,
//   then tightened with Piedmont-oriented sources where needed.
// - `si` was added only where transplant timing implied a real indoor-start lead.
// - `sg` and `tg` were kept conservative and only used where protected culture was directly
//   supported or strongly implied by the source stack.
// - Greenhouse expansions in this file are intentionally narrow: only edge slots already
//   supported by the review notes were promoted into `sg`/`tg`, rather than assuming every
//   cold-tolerant crop deserves a protected-culture lane.
// - Flowers, perennials, strawberries, ginger, and similar edge cases are lower-confidence than
//   annual vegetables because the Carrboro/Piedmont sources are less explicit for them.

const MONTHS = [
  { id: "jan", name: "January", short: "Jan" },
  { id: "feb", name: "February", short: "Feb" },
  { id: "mar", name: "March", short: "Mar" },
  { id: "apr", name: "April", short: "Apr" },
  { id: "may", name: "May", short: "May" },
  { id: "jun", name: "June", short: "Jun" },
  { id: "jul", name: "July", short: "Jul" },
  { id: "aug", name: "August", short: "Aug" },
  { id: "sep", name: "September", short: "Sep" },
  { id: "oct", name: "October", short: "Oct" },
  { id: "nov", name: "November", short: "Nov" },
  { id: "dec", name: "December", short: "Dec" }
];

const LEGEND = {
  si: "Sow Indoors",
  t: "Transplant",
  s: "Sow Outdoors / Bulbs & Sets",
  sg: "Sow Greenhouse",
  tg: "Transplant Greenhouse",
  h: "Harvest",
  '*': "Special Handling",
  B: "Outdoors (Bulbs / Sets)"
};

const TASKS = {
  jan: {
    half1: "Order seeds; clean and sharpen tools; prune dormant fruit trees and grapes; inspect stored pantry crops; check grow lights; purge vent greenhouse on warm days; scout for winter pests (aphids, whiteflies); secondary frost protection for temps below 25°F",
    half2: "Send soil test to NC State; inventory potting mix/trays; plan bed layout; organize seed storage; take hardwood cuttings (figs, grapes, blueberries); purge vent greenhouse on warm days; scout for winter pests (aphids, whiteflies); secondary frost protection for temps below 25°F"
  },
  feb: {
    half1: "Finish fruit tree pruning; spread compost (no till); check irrigation lines; check hardwood cuttings for callus/roots; purge vent greenhouse on warm days; scout for winter pests (aphids, whiteflies); leach greenhouse soil for salt buildup if needed",
    half2: "Prune roses and woody herbs; clean greenhouse glazing; scrub seedling trays; top-dress berries with compost; pre-sprout turmeric on heat mats at 80°F; purge vent greenhouse on warm days; scout for winter pests (aphids, whiteflies); leach greenhouse soil for salt buildup if needed"
  },
  mar: {
    half1: "Harden off cool-weather seedlings; weed early; set up trellises; check raised beds for rot; start sweet potato slips from tubers; continue pre-sprouting turmeric warm; leach greenhouse soil for salt buildup if needed",
    half2: "Check irrigation pressure; set up heavy-duty tomato cages; side-dress overwintered crops; clean rain barrels"
  },
  apr: {
    half1: "Watch for \"False Spring\" (covers ready); harden off warm-season seedlings; weed; thin root crops; divide clumping herbs (chives/mint); wait for 60°F soil at 4\" before transplanting tomatoes and peppers or sowing super-sweet corn",
    half2: "Scout for aphids on brassicas; side-dress heavy feeders; protect strawberry blooms; install insect netting; wait for 60°F soil at 4\" before transplanting tomatoes and peppers or sowing super-sweet corn"
  },
  may: {
    half1: "Mulch heavily; scout for potato beetles; hill up potatoes; install drip tape; take softwood cuttings of tender herbs (lemon verbena, stevia)",
    half2: "Deep water (1 inch/week); trellis tomatoes; scout for vine borers; install mesh row covers on cucurbits before bloom; weed; take softwood cuttings of woody herbs (sage, thyme, oregano)"
  },
  jun: {
    half1: "Harvest garlic scapes; Stop watering onions/garlic; deadhead flowers; keep mesh row covers on cucurbits until bloom; root tomato suckers in water (for late-season backup plants)",
    half2: "Harvest Garlic & Onions (cure in shade); summer prune water sprouts; shade cloth on greenhouse when temps reach 85°F; harvest herbs for drying"
  },
  jul: {
    half1: "Prune blackberry/raspberry canes; pull bolted lettuce; deep water fruit trees; turn compost pile; take cuttings of annual flowers (coleus, zinnias)",
    half2: "Solarize empty beds; sow buckwheat in open beds as a fast summer cover crop; remove spent squash plants; harvest first summer fruits; monitor for hornworms"
  },
  aug: {
    half1: "Amend soil for Fall; prune basil/perilla hard; maintenance prune tomatoes; sow buckwheat in open beds if a quick summer cover is needed; take semi-hardwood cuttings (rosemary, lavender) for next year",
    half2: "Renovate strawberry beds (thin runners); preserve harvest; check row covers; pre-water fall seed beds; use shade cloth and daily moisture for fall germination; pot up rooted herb cuttings"
  },
  sep: {
    half1: "Seed-save heirloom varieties; watch for cabbage worms; maintain moisture for fall roots; take cuttings of tender perennials to overwinter indoors",
    half2: "Prep cold frames; sow crimson clover and cereal rye in resting beds; harvest sweet potatoes (cure); bring tender potted herbs indoors; remove shade cloth"
  },
  oct: {
    half1: "Harvest pumpkins/winter squash; mulch perennials; sow crimson clover and cereal rye in open beds; harvest ginger/turmeric roots; roast/freeze peppers; collect seeds",
    half2: "Cut back asparagus ferns; heavy mulch for winter; drain hoses; final harvest of tender crops before frost"
  },
  nov: {
    half1: "Collect leaves for compost; winterize irrigation; clean/store cages; dig up tender bulbs (dahlia); take hardwood cuttings of currants/elderberry; prepare secondary frost protection for temps below 25°F",
    half2: "Protect citrus/tender plants; seal greenhouse drafts; clean and oil tools; harvest final root crops; prepare secondary frost protection for temps below 25°F"
  },
  dec: {
    half1: "Tool maintenance; structural repairs to beds; check greenhouse heater; inspect stored harvest; purge vent greenhouse on warm days; scout for winter pests (aphids, whiteflies); secondary frost protection for temps below 25°F",
    half2: "Review season notes; plan next year's map; order seeds early; rest; purge vent greenhouse on warm days; scout for winter pests (aphids, whiteflies); secondary frost protection for temps below 25°F"
  }
};

const PLANTS = [
  {
    id: 1,
    name: "Arugula",
    type: "vegetable",
    spacing: "6-9",
    daysToHarvest: "40-50",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: ["s"], half2: ["s"] },
      mar: { half1: ["s"], half2: ["s", "h"] },
      apr: { half1: ["h"], half2: ["h"] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: ["s"], half2: ["s"] },
      sep: { half1: ["s"], half2: ["s", "h"] },
      oct: { half1: ["h"], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 2,
    name: "Lettuce, Head",
    type: "vegetable",
    spacing: "10",
    daysToHarvest: "T = 45-60, S = 70-85",
    months: {
      jan: { half1: [], half2: ["si"] },
      feb: { half1: ["s", "si"], half2: ["s", "si", "sg", "tg"] },
      mar: { half1: ["s", "si", "tg"], half2: ["t"] },
      apr: { half1: ["t", "h"], half2: ["t", "h"] },
      may: { half1: ["h"], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: ["si"], half2: ["si"] },
      aug: { half1: ["si"], half2: ["s", "t", "tg", "*"] },
      sep: { half1: ["s", "t", "tg", "*"], half2: ["t", "h"] },
      oct: { half1: ["t", "sg", "h"], half2: ["h"] },
      nov: { half1: ["h"], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 3,
    name: "Radishes",
    type: "vegetable",
    spacing: "1",
    daysToHarvest: "20-25",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: ["s"] },
      mar: { half1: ["s", "h"], half2: ["s", "h"] },
      apr: { half1: ["s", "h"], half2: ["h"] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: ["s"] },
      sep: { half1: ["s", "h"], half2: ["s", "h"] },
      oct: { half1: ["s", "h"], half2: ["h"] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 4,
    name: "Lettuce, Leaf",
    type: "vegetable",
    spacing: "6",
    daysToHarvest: "S = 40-50, T = 15-25",
    months: {
      jan: { half1: ["si"], half2: ["si"] },
      feb: { half1: ["s", "t", "si"], half2: ["s", "t", "si", "sg", "tg"] },
      mar: { half1: ["s", "t", "tg", "h"], half2: ["s", "t", "h"] },
      apr: { half1: ["s", "t", "h"], half2: ["s", "t", "h"] },
      may: { half1: ["h"], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: ["si"], half2: ["si"] },
      aug: { half1: ["s", "t", "si"], half2: ["s", "t", "tg", "*"] },
      sep: { half1: ["s", "t", "tg", "*", "h"], half2: ["s", "t", "h"] },
      oct: { half1: ["sg", "h"], half2: ["sg", "h"] },
      nov: { half1: ["h"], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 5,
    name: "Onions, Green",
    type: "vegetable",
    spacing: "1-2",
    daysToHarvest: "60-70, 42-56",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: ["B"], half2: ["B"] },
      mar: { half1: ["B"], half2: ["B"] },
      apr: { half1: ["B", "h"], half2: ["h"] },
      may: { half1: ["h"], half2: ["h"] },
      jun: { half1: ["h"], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: ["B"] },
      sep: { half1: ["B"], half2: [] },
      oct: { half1: ["h"], half2: ["h"] },
      nov: { half1: ["h"], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 6,
    name: "Spinach",
    type: "vegetable",
    spacing: "6",
    daysToHarvest: "50-60",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: ["sg"], half2: ["sg"] },
      mar: { half1: ["s"], half2: ["s"] },
      apr: { half1: ["s", "h"], half2: ["s", "h"] },
      may: { half1: ["h"], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: ["s", "*"] },
      sep: { half1: ["s"], half2: ["s"] },
      oct: { half1: ["s", "h"], half2: ["s", "sg", "h"] },
      nov: { half1: ["s", "sg", "*", "h"], half2: ["h"] },
      dec: { half1: ["h"], half2: ["h"] }
    }
  },
  {
    id: 7,
    name: "Celery",
    type: "vegetable",
    spacing: "6-8",
    daysToHarvest: "T = 40-70, S = 120-150**",
    months: {
      jan: { half1: ["si"], half2: ["si"] },
      feb: { half1: [], half2: ["t"] },
      mar: { half1: ["t", "si"], half2: ["t", "si"] },
      apr: { half1: ["si"], half2: ["si"] },
      may: { half1: ["si"], half2: ["si"] },
      jun: { half1: [], half2: ["t"] },
      jul: { half1: ["t"], half2: ["t"] },
      aug: { half1: ["t"], half2: [] },
      sep: { half1: [], half2: [] },
      oct: { half1: [], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 8,
    name: "Onions, Bulb",
    type: "vegetable",
    spacing: "4",
    daysToHarvest: "90-120",
    months: {
      jan: { half1: ["si"], half2: ["s", "si"] },
      feb: { half1: ["s", "tg", "*"], half2: ["s", "t"] },
      mar: { half1: ["t"], half2: ["t"] },
      apr: { half1: ["t"], half2: [] },
      may: { half1: [], half2: [] },
      jun: { half1: ["h"], half2: ["h"] },
      jul: { half1: ["h"], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: [], half2: ["s"] },
      oct: { half1: ["s"], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: ["si"], half2: ["si"] }
    }
  },
  {
    id: 9,
    name: "Leek",
    type: "vegetable",
    spacing: "4",
    daysToHarvest: "T = 50-80, S = 120-150",
    months: {
      jan: { half1: ["si"], half2: ["si"] },
      feb: { half1: ["si"], half2: ["si"] },
      mar: { half1: ["si"], half2: [] },
      apr: { half1: ["s", "t"], half2: ["s", "t"] },
      may: { half1: ["s", "t"], half2: ["t"] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: [], half2: [] },
      oct: { half1: [], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 10,
    name: "Kale",
    type: "vegetable",
    spacing: "6",
    daysToHarvest: "14-22, 40-50",
    months: {
      jan: { half1: ["si"], half2: ["si"] },
      feb: { half1: ["si"], half2: ["s", "t", "si"] },
      mar: { half1: ["s", "t"], half2: ["h"] },
      apr: { half1: ["h"], half2: ["h"] },
      may: { half1: ["h"], half2: ["h"] },
      jun: { half1: [], half2: [] },
      jul: { half1: ["si"], half2: ["si"] },
      aug: { half1: ["s", "t", "si"], half2: ["s", "t", "si"] },
      sep: { half1: ["s", "t", "h"], half2: ["s", "t", "h"] },
      oct: { half1: ["s", "t", "h"], half2: ["sg", "h"] },
      nov: { half1: ["sg", "h"], half2: ["sg", "h"] },
      dec: { half1: ["h"], half2: ["h"] }
    }
  },
  {
    id: 11,
    name: "Collard Greens",
    type: "vegetable",
    spacing: "18",
    daysToHarvest: "T = 32-72, S = 60-100",
    months: {
      jan: { half1: ["si"], half2: ["si"] },
      feb: { half1: ["si"], half2: ["t", "si"] },
      mar: { half1: ["t"], half2: ["t"] },
      apr: { half1: ["t"], half2: ["t", "h"] },
      may: { half1: ["t", "h"], half2: ["t", "h"] },
      jun: { half1: ["t", "h"], half2: ["t", "si", "h"] },
      jul: { half1: ["si", "h"], half2: ["s", "t", "si", "h"] },
      aug: { half1: ["s", "t", "h"], half2: ["s", "t", "h"] },
      sep: { half1: ["s", "t", "h"], half2: ["h"] },
      oct: { half1: ["sg", "h"], half2: ["sg", "h"] },
      nov: { half1: ["sg", "h"], half2: ["sg", "h"] },
      dec: { half1: ["h"], half2: [] }
    }
  },
  {
    id: 12,
    name: "Bok Choy",
    type: "vegetable",
    spacing: "7-12",
    daysToHarvest: "T = 30-75, S = 45-90**",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: ["si"] },
      mar: { half1: ["si"], half2: ["t"] },
      apr: { half1: [], half2: [] },
      may: { half1: ["h"], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: ["si"] },
      aug: { half1: ["si"], half2: ["t"] },
      sep: { half1: ["t", "tg"], half2: ["t", "h"] },
      oct: { half1: ["tg", "h"], half2: ["h"] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 13,
    name: "Snapdragons",
    type: "flower",
    spacing: "6-12",
    daysToHarvest: "S = 60-90",
    months: {
      jan: { half1: [], half2: ["si"] },
      feb: { half1: ["si"], half2: ["si"] },
      mar: { half1: ["si"], half2: [] },
      apr: { half1: ["t"], half2: ["t"] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: ["t"], half2: ["t"] },
      oct: { half1: ["t"], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 14,
    name: "Lavender",
    type: "flower",
    spacing: "12-18",
    daysToHarvest: "T = 90-120",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: ["si"], half2: ["si"] },
      mar: { half1: ["si"], half2: [] },
      apr: { half1: [], half2: ["t"] },
      may: { half1: ["t"], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: [], half2: ["t"] },
      oct: { half1: ["t"], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 15,
    name: "Stock",
    type: "flower",
    spacing: "8-12",
    daysToHarvest: "S = 60-80",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: ["si"] },
      mar: { half1: ["si"], half2: ["si"] },
      apr: { half1: ["t"], half2: ["t"] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: [], half2: [] },
      oct: { half1: [], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 16,
    name: "Chives",
    type: "vegetable",
    spacing: "8",
    daysToHarvest: "30-60",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: ["si"], half2: ["si"] },
      mar: { half1: ["t"], half2: ["t"] },
      apr: { half1: ["t"], half2: [] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: [], half2: [] },
      oct: { half1: [], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 17,
    name: "Snap Pea (Bush)",
    type: "vegetable",
    spacing: "2",
    daysToHarvest: "50-55",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: ["s"], half2: ["s"] },
      mar: { half1: ["s"], half2: ["s"] },
      apr: { half1: ["s"], half2: ["h"] },
      may: { half1: ["h"], half2: ["h"] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: ["s", "*"], half2: ["s", "*"] },
      oct: { half1: ["h"], half2: ["h"] },
      nov: { half1: ["h"], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 18,
    name: "Snap Pea (Pole)",
    type: "vegetable",
    spacing: "6",
    daysToHarvest: "65-70",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: ["s"], half2: ["s"] },
      mar: { half1: ["s"], half2: ["s"] },
      apr: { half1: ["s"], half2: [] },
      may: { half1: ["h"], half2: ["h"] },
      jun: { half1: ["h"], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: ["s", "*"], half2: ["s", "*"] },
      oct: { half1: [], half2: ["h"] },
      nov: { half1: ["h"], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 19,
    name: "Peas, Vining",
    type: "vegetable",
    spacing: "2-3",
    daysToHarvest: "54-72",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: ["s"], half2: ["s"] },
      mar: { half1: ["s"], half2: ["s"] },
      apr: { half1: ["s"], half2: [] },
      may: { half1: ["h"], half2: ["h"] },
      jun: { half1: ["h"], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: ["s", "*"], half2: ["s", "*"] },
      oct: { half1: [], half2: ["h"] },
      nov: { half1: ["h"], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 20,
    name: "Peas, Bush",
    type: "vegetable",
    spacing: "4",
    daysToHarvest: "54-60",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: ["s"], half2: ["s"] },
      mar: { half1: ["s"], half2: ["s"] },
      apr: { half1: ["s"], half2: ["h"] },
      may: { half1: ["h"], half2: ["h"] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: ["s", "*"], half2: ["s", "*"] },
      oct: { half1: ["h"], half2: ["h"] },
      nov: { half1: ["h"], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 21,
    name: "Mustard",
    type: "vegetable",
    spacing: "2",
    daysToHarvest: "30-40",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: ["s"] },
      mar: { half1: ["s"], half2: ["s", "h"] },
      apr: { half1: ["s", "h"], half2: ["s", "h"] },
      may: { half1: ["s", "h"], half2: ["s", "h"] },
      jun: { half1: ["s", "h"], half2: ["s"] },
      jul: { half1: [], half2: [] },
      aug: { half1: ["s"], half2: ["s"] },
      sep: { half1: ["s", "h"], half2: ["s", "h"] },
      oct: { half1: ["h"], half2: ["h"] },
      nov: { half1: ["h"], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 22,
    name: "Parsley",
    type: "vegetable",
    spacing: "9-12",
    daysToHarvest: "T = 33, S = 75",
    months: {
      jan: { half1: [], half2: ["si"] },
      feb: { half1: ["si"], half2: ["s", "t"] },
      mar: { half1: ["s", "t"], half2: ["s", "t"] },
      apr: { half1: ["s", "t", "h"], half2: ["h"] },
      may: { half1: ["h"], half2: ["h"] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: ["si"] },
      aug: { half1: ["s", "t", "si"], half2: ["s", "t"] },
      sep: { half1: ["s", "t", "*", "h"], half2: ["s", "t", "h"] },
      oct: { half1: ["sg", "h"], half2: ["sg", "h"] },
      nov: { half1: ["sg", "h"], half2: ["sg", "h"] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 23,
    name: "Chard, Swiss",
    type: "vegetable",
    spacing: "6",
    daysToHarvest: "60-70, 32-42",
    months: {
      jan: { half1: [], half2: ["si"] },
      feb: { half1: ["si"], half2: ["si"] },
      mar: { half1: ["s", "t"], half2: ["s", "t"] },
      apr: { half1: ["s", "t"], half2: ["s", "t", "h"] },
      may: { half1: ["h"], half2: ["h"] },
      jun: { half1: ["h"], half2: ["si", "h"] },
      jul: { half1: ["si", "h"], half2: ["si"] },
      aug: { half1: ["s", "t"], half2: ["s", "t", "h"] },
      sep: { half1: ["s", "t", "h"], half2: ["h"] },
      oct: { half1: ["sg", "h"], half2: ["sg", "h"] },
      nov: { half1: ["sg", "h"], half2: ["sg", "h"] },
      dec: { half1: ["h"], half2: [] }
    }
  },
  {
    id: 24,
    name: "Carrots",
    type: "vegetable",
    spacing: "2",
    daysToHarvest: "75-80",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: ["s"], half2: ["s"] },
      mar: { half1: ["s"], half2: ["s"] },
      apr: { half1: [], half2: [] },
      may: { half1: [], half2: ["h"] },
      jun: { half1: ["h"], half2: ["s", "*", "h"] },
      jul: { half1: ["s", "*", "h"], half2: ["*", "h"] },
      aug: { half1: ["s", "*"], half2: ["s", "*"] },
      sep: { half1: ["s", "*"], half2: ["s", "*"] },
      oct: { half1: ["s", "sg", "*"], half2: ["sg", "*"] },
      nov: { half1: ["h"], half2: ["h"] },
      dec: { half1: ["h"], half2: ["h"] }
    }
  },
  {
    id: 25,
    name: "Peppers",
    type: "vegetable",
    spacing: "18",
    daysToHarvest: "T = 75-80, S = 145-150**",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: ["si"] },
      mar: { half1: ["si"], half2: ["si"] },
      apr: { half1: ["si"], half2: ["t"] },
      may: { half1: ["t"], half2: ["t"] },
      jun: { half1: ["t"], half2: [] },
      jul: { half1: ["h"], half2: ["h"] },
      aug: { half1: ["h"], half2: ["h"] },
      sep: { half1: ["h"], half2: ["h"] },
      oct: { half1: ["h"], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 26,
    name: "Tomatoes",
    type: "vegetable",
    spacing: "18",
    daysToHarvest: "T = 75-85, S = 125-135**",
    months: {
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
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 27,
    name: "Strawberries (Bare-root)",
    type: "vegetable",
    spacing: "",
    daysToHarvest: "",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: ["t", "*"], half2: ["t", "*"] },
      apr: { half1: ["t", "*"], half2: ["t", "*"] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: [], half2: ["t"] },
      oct: { half1: ["t"], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 28,
    name: "Potatoes (Irish)",
    type: "vegetable",
    spacing: "",
    daysToHarvest: "",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: ["s"] },
      mar: { half1: ["s"], half2: ["s"] },
      apr: { half1: ["s"], half2: [] },
      may: { half1: [], half2: [] },
      jun: { half1: ["h"], half2: ["h"] },
      jul: { half1: ["h"], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: [], half2: [] },
      oct: { half1: [], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 29,
    name: "Eggplant",
    type: "vegetable",
    spacing: "24",
    daysToHarvest: "T = 90-95, S = 150-155**",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: ["si"] },
      mar: { half1: ["si"], half2: ["si"] },
      apr: { half1: ["si"], half2: ["t"] },
      may: { half1: ["t"], half2: ["t"] },
      jun: { half1: ["t"], half2: [] },
      jul: { half1: [], half2: ["h"] },
      aug: { half1: ["h"], half2: ["h"] },
      sep: { half1: ["h"], half2: ["h"] },
      oct: { half1: ["h"], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 30,
    name: "Calendula",
    type: "flower",
    spacing: "8-12",
    daysToHarvest: "S = 50-70",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: ["si"] },
      mar: { half1: ["si", "s"], half2: ["s", "t"] },
      apr: { half1: ["s", "t"], half2: [] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: [], half2: ["s"] },
      oct: { half1: ["s"], half2: ["s"] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 31,
    name: "Cabbage",
    type: "vegetable",
    spacing: "12",
    daysToHarvest: "63-75",
    months: {
      jan: { half1: [], half2: ["si"] },
      feb: { half1: ["si", "t"], half2: ["si", "t"] },
      mar: { half1: ["t"], half2: ["t"] },
      apr: { half1: ["t"], half2: ["h"] },
      may: { half1: ["h"], half2: ["h"] },
      jun: { half1: ["h"], half2: [] },
      jul: { half1: ["si"], half2: ["si", "t"] },
      aug: { half1: ["si", "t"], half2: ["t"] },
      sep: { half1: ["t"], half2: ["h"] },
      oct: { half1: ["tg", "h"], half2: ["h"] },
      nov: { half1: ["h"], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 32,
    name: "Broccoli",
    type: "vegetable",
    spacing: "18",
    daysToHarvest: "T = 70-80",
    months: {
      jan: { half1: [], half2: ["si"] },
      feb: { half1: ["si"], half2: ["si", "t"] },
      mar: { half1: ["t"], half2: ["t"] },
      apr: { half1: ["t"], half2: [] },
      may: { half1: ["h"], half2: ["h"] },
      jun: { half1: ["h"], half2: [] },
      jul: { half1: ["si"], half2: ["si"] },
      aug: { half1: ["si", "t"], half2: ["t"] },
      sep: { half1: ["t"], half2: [] },
      oct: { half1: ["tg", "h"], half2: ["h"] },
      nov: { half1: ["h"], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 33,
    name: "Cauliflower",
    type: "vegetable",
    spacing: "18",
    daysToHarvest: "T = 55-65, S = 85-95",
    months: {
      jan: { half1: [], half2: ["si"] },
      feb: { half1: ["si"], half2: ["si", "s", "t"] },
      mar: { half1: ["s", "t"], half2: ["s", "t"] },
      apr: { half1: ["t"], half2: ["h"] },
      may: { half1: ["h"], half2: ["h"] },
      jun: { half1: [], half2: [] },
      jul: { half1: ["si"], half2: ["si"] },
      aug: { half1: ["si", "s", "t"], half2: ["s", "t"] },
      sep: { half1: ["s", "t"], half2: ["s", "t"] },
      oct: { half1: ["tg", "h"], half2: ["h"] },
      nov: { half1: ["h"], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 34,
    name: "Yarrow",
    type: "flower",
    spacing: "",
    daysToHarvest: "",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: ["si"] },
      mar: { half1: ["si"], half2: ["si"] },
      apr: { half1: ["t"], half2: ["t"] },
      may: { half1: ["t"], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: ["t"], half2: ["t"] },
      oct: { half1: ["t"], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 35,
    name: "Basil",
    type: "vegetable",
    spacing: "2-8",
    daysToHarvest: "T = 14-35, S = 50-75",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: [] },
      apr: { half1: ["si"], half2: ["si"] },
      may: { half1: ["s", "t"], half2: ["s", "t", "h"] },
      jun: { half1: ["s", "t", "h"], half2: ["s", "t", "h"] },
      jul: { half1: ["s", "t", "h"], half2: ["s", "t", "h"] },
      aug: { half1: ["h"], half2: ["h"] },
      sep: { half1: ["h"], half2: [] },
      oct: { half1: [], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 36,
    name: "Kohlrabi",
    type: "vegetable",
    spacing: "4",
    daysToHarvest: "T = 22-32, S = 50-60",
    months: {
      jan: { half1: [], half2: ["si"] },
      feb: { half1: ["si"], half2: ["si", "s", "t"] },
      mar: { half1: ["s", "t"], half2: ["s", "t", "h"] },
      apr: { half1: ["s", "t", "h"], half2: ["s", "t", "h"] },
      may: { half1: ["s", "t", "h"], half2: ["s", "t", "h"] },
      jun: { half1: ["h"], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: ["si", "s", "t"], half2: ["s", "t"] },
      sep: { half1: ["s", "t", "h"], half2: ["h"] },
      oct: { half1: ["h"], half2: ["h"] },
      nov: { half1: ["h"], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 37,
    name: "Fennel",
    type: "vegetable",
    spacing: "6-12",
    daysToHarvest: "60-90",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: ["s"], half2: ["s"] },
      apr: { half1: ["s"], half2: ["s"] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: ["s"], half2: ["s"] },
      aug: { half1: ["s"], half2: ["s"] },
      sep: { half1: [], half2: [] },
      oct: { half1: [], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 38,
    name: "Cilantro",
    type: "vegetable",
    spacing: "2-4",
    daysToHarvest: "50-55",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: ["s"], half2: ["s"] },
      mar: { half1: ["s"], half2: ["s"] },
      apr: { half1: ["h"], half2: ["h"] },
      may: { half1: ["h"], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: ["s"] },
      sep: { half1: ["s"], half2: ["s"] },
      oct: { half1: ["s", "h"], half2: ["sg", "h"] },
      nov: { half1: ["h"], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 39,
    name: "Turnips",
    type: "vegetable",
    spacing: "2",
    daysToHarvest: "55-60",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: ["s"], half2: ["s"] },
      mar: { half1: ["s"], half2: ["s"] },
      apr: { half1: ["s"], half2: ["s", "h"] },
      may: { half1: ["s", "h"], half2: ["s", "h"] },
      jun: { half1: ["s", "h"], half2: ["s", "h"] },
      jul: { half1: [], half2: [] },
      aug: { half1: ["s"], half2: ["s"] },
      sep: { half1: ["s"], half2: ["h"] },
      oct: { half1: ["h"], half2: ["h"] },
      nov: { half1: ["h"], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 40,
    name: "Sage",
    type: "vegetable",
    spacing: "",
    daysToHarvest: "",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: ["si"] },
      mar: { half1: ["si"], half2: [] },
      apr: { half1: [], half2: ["t"] },
      may: { half1: ["t"], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: [], half2: ["t"] },
      oct: { half1: ["t"], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 41,
    name: "Marigolds",
    type: "flower",
    spacing: "",
    daysToHarvest: "",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: ["si"] },
      apr: { half1: ["si"], half2: ["t"] },
      may: { half1: ["t"], half2: ["s", "t"] },
      jun: { half1: ["s"], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: [], half2: [] },
      oct: { half1: [], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 42,
    name: "Echinacea",
    type: "flower",
    spacing: "",
    daysToHarvest: "",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: ["si"] },
      mar: { half1: ["si"], half2: ["si"] },
      apr: { half1: [], half2: [] },
      may: { half1: ["t"], half2: ["t"] },
      jun: { half1: ["t"], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: [], half2: [] },
      oct: { half1: [], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 43,
    name: "Chamomile",
    type: "flower",
    spacing: "",
    daysToHarvest: "S = 60-90",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: ["si"] },
      apr: { half1: ["si"], half2: ["s", "t"] },
      may: { half1: ["s"], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: [], half2: [] },
      oct: { half1: [], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 44,
    name: "Moonflower",
    type: "flower",
    spacing: "",
    daysToHarvest: "S = 60-90",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: ["si"], half2: ["si"] },
      apr: { half1: ["si"], half2: [] },
      may: { half1: ["s", "t"], half2: ["s", "t"] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: [], half2: [] },
      oct: { half1: [], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 45,
    name: "Parsnips",
    type: "vegetable",
    spacing: "3-4",
    daysToHarvest: "100-130",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: [] },
      apr: { half1: [], half2: ["s", "*"] },
      may: { half1: ["s", "*"], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: ["s", "*"] },
      sep: { half1: ["s", "*"], half2: [] },
      oct: { half1: ["sg", "*"], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 46,
    name: "Dill",
    type: "vegetable",
    spacing: "2-4",
    daysToHarvest: "40-55",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: ["s"] },
      mar: { half1: ["s"], half2: ["s", "h"] },
      apr: { half1: ["s", "h"], half2: ["h"] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: ["s"], half2: ["s"] },
      sep: { half1: ["s", "h"], half2: ["h"] },
      oct: { half1: ["h"], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 47,
    name: "Borage",
    type: "flower",
    spacing: "",
    daysToHarvest: "",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: [] },
      apr: { half1: ["s"], half2: ["s"] },
      may: { half1: ["s"], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: [], half2: [] },
      oct: { half1: [], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 48,
    name: "Beets",
    type: "vegetable",
    spacing: "2",
    daysToHarvest: "55-60",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: ["sg"], half2: ["sg"] },
      mar: { half1: ["s"], half2: ["s"] },
      apr: { half1: ["s"], half2: ["s", "h"] },
      may: { half1: ["h"], half2: ["h"] },
      jun: { half1: ["h"], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: ["s", "*"], half2: ["s", "*"] },
      sep: { half1: ["s", "*"], half2: ["s", "*"] },
      oct: { half1: ["s", "sg", "*", "h"], half2: ["sg", "h"] },
      nov: { half1: ["h"], half2: ["h"] },
      dec: { half1: ["h"], half2: [] }
    }
  },
  {
    id: 49,
    name: "Ginger",
    type: "vegetable",
    spacing: "",
    daysToHarvest: "",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: ["*"] },
      apr: { half1: ["*"], half2: [] },
      may: { half1: [], half2: ["t"] },
      jun: { half1: ["t"], half2: ["t"] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: [], half2: [] },
      oct: { half1: [], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 50,
    name: "Cabbage (Chinese)",
    type: "vegetable",
    spacing: "12",
    daysToHarvest: "T = 45-55, S = 75-85",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: ["si"] },
      mar: { half1: ["si"], half2: ["s", "t"] },
      apr: { half1: [], half2: [] },
      may: { half1: ["h"], half2: ["h"] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: ["s"], half2: ["s", "si"] },
      sep: { half1: ["si"], half2: ["t"] },
      oct: { half1: ["t", "tg"], half2: ["h"] },
      nov: { half1: ["h"], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 51,
    name: "Sunflower",
    type: "flower",
    spacing: "9-24",
    daysToHarvest: "55-110",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: [] },
      apr: { half1: ["s"], half2: ["s"] },
      may: { half1: ["s"], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: [], half2: [] },
      oct: { half1: [], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 52,
    name: "Squash (Summer)",
    type: "vegetable",
    spacing: "24",
    daysToHarvest: "T = 30-40, S = 50-60",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: [] },
      apr: { half1: ["si", "s", "t"], half2: ["s", "t"] },
      may: { half1: ["s", "t"], half2: ["s", "t", "h"] },
      jun: { half1: ["s", "t", "h"], half2: ["s", "t", "h"] },
      jul: { half1: ["s", "t", "h"], half2: ["s", "t", "h"] },
      aug: { half1: ["s", "t", "h"], half2: ["h"] },
      sep: { half1: ["h"], half2: [] },
      oct: { half1: [], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 53,
    name: "Cucumbers",
    type: "vegetable",
    spacing: "12",
    daysToHarvest: "T = 28-37, S = 56-65",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: [] },
      apr: { half1: ["si"], half2: ["s", "t"] },
      may: { half1: ["s", "t"], half2: ["s", "t"] },
      jun: { half1: ["s", "t", "h"], half2: ["s", "t", "h"] },
      jul: { half1: ["s", "t", "h"], half2: ["s", "t", "h"] },
      aug: { half1: ["s", "t", "h"], half2: ["h"] },
      sep: { half1: ["h"], half2: [] },
      oct: { half1: [], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 54,
    name: "Zinnias",
    type: "flower",
    spacing: "",
    daysToHarvest: "",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: ["si"] },
      apr: { half1: ["si"], half2: ["s", "t"] },
      may: { half1: ["s", "t"], half2: ["s"] },
      jun: { half1: ["s"], half2: ["s"] },
      jul: { half1: ["s"], half2: ["s"] },
      aug: { half1: [], half2: [] },
      sep: { half1: [], half2: [] },
      oct: { half1: [], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 55,
    name: "Nasturtium",
    type: "flower",
    spacing: "",
    daysToHarvest: "",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: ["si"] },
      apr: { half1: ["si", "s", "t"], half2: ["s", "t"] },
      may: { half1: ["s"], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: [], half2: [] },
      oct: { half1: [], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 56,
    name: "Corn (Sweet)",
    type: "vegetable",
    spacing: "12",
    daysToHarvest: "85-90",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: ["s"] },
      apr: { half1: ["s"], half2: ["s"] },
      may: { half1: ["s"], half2: ["s"] },
      jun: { half1: [], half2: ["h"] },
      jul: { half1: ["h"], half2: ["h"] },
      aug: { half1: ["h"], half2: [] },
      sep: { half1: [], half2: [] },
      oct: { half1: [], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 57,
    name: "Cantaloupe",
    type: "vegetable",
    spacing: "24",
    daysToHarvest: "T = 57-62, S = 85-90",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: [] },
      apr: { half1: ["si"], half2: ["s", "t"] },
      may: { half1: ["s", "t"], half2: ["s", "t"] },
      jun: { half1: ["s", "t"], half2: ["s", "t", "h"] },
      jul: { half1: ["s", "t", "h"], half2: ["h"] },
      aug: { half1: ["h"], half2: ["h"] },
      sep: { half1: ["h"], half2: [] },
      oct: { half1: ["h"], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 58,
    name: "Squash (Winter)",
    type: "vegetable",
    spacing: "36",
    daysToHarvest: "T = 42-67, S = 70-95",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: [] },
      apr: { half1: ["si"], half2: ["s", "t"] },
      may: { half1: ["s", "t"], half2: ["s", "t"] },
      jun: { half1: ["s", "t"], half2: ["s", "t"] },
      jul: { half1: ["s", "t"], half2: ["s", "t"] },
      aug: { half1: ["s", "t"], half2: ["h"] },
      sep: { half1: ["h"], half2: ["h"] },
      oct: { half1: ["h"], half2: ["h"] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 59,
    name: "Potatoes (Sweet)",
    type: "vegetable",
    spacing: "10",
    daysToHarvest: "T = 95-125",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: [] },
      apr: { half1: [], half2: [] },
      may: { half1: ["t"], half2: ["t"] },
      jun: { half1: ["t"], half2: ["t"] },
      jul: { half1: ["t"], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: [], half2: ["h"] },
      oct: { half1: ["h"], half2: ["h"] },
      nov: { half1: ["h"], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 60,
    name: "Peas (Field)",
    type: "vegetable",
    spacing: "4",
    daysToHarvest: "55-65",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: [] },
      apr: { half1: [], half2: ["s"] },
      may: { half1: ["s"], half2: ["s"] },
      jun: { half1: ["s"], half2: ["s", "h"] },
      jul: { half1: ["s", "h"], half2: ["h"] },
      aug: { half1: ["h"], half2: ["h"] },
      sep: { half1: ["h"], half2: [] },
      oct: { half1: [], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 61,
    name: "Lima Bean (Pole)",
    type: "vegetable",
    spacing: "6",
    daysToHarvest: "75-95",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: [] },
      apr: { half1: [], half2: ["s"] },
      may: { half1: ["s"], half2: ["s"] },
      jun: { half1: ["s"], half2: ["h"] },
      jul: { half1: ["h"], half2: ["s", "h"] },
      aug: { half1: ["h"], half2: ["h"] },
      sep: { half1: ["h"], half2: ["h"] },
      oct: { half1: ["h"], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 62,
    name: "Watermelon",
    type: "vegetable",
    spacing: "60",
    daysToHarvest: "T = 62-72, S = 90-100",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: [] },
      apr: { half1: ["si"], half2: ["s", "t"] },
      may: { half1: ["s", "t"], half2: ["s", "t"] },
      jun: { half1: ["s", "t"], half2: ["s", "t"] },
      jul: { half1: ["s", "t", "h"], half2: ["h"] },
      aug: { half1: ["h"], half2: ["h"] },
      sep: { half1: ["h"], half2: [] },
      oct: { half1: ["h"], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 63,
    name: "Okra",
    type: "vegetable",
    spacing: "12",
    daysToHarvest: "T = 18-28, S = 60-70",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: [] },
      apr: { half1: [], half2: ["si"] },
      may: { half1: ["s", "t"], half2: ["s", "t"] },
      jun: { half1: ["s", "t"], half2: [] },
      jul: { half1: [], half2: ["h"] },
      aug: { half1: ["s", "h"], half2: ["s", "h"] },
      sep: { half1: ["h"], half2: ["h"] },
      oct: { half1: ["h"], half2: ["h"] },
      nov: { half1: ["h"], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 64,
    name: "Lima Bean (Bush)",
    type: "vegetable",
    spacing: "6",
    daysToHarvest: "65-80",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: [] },
      apr: { half1: [], half2: ["s"] },
      may: { half1: ["s"], half2: ["s"] },
      jun: { half1: ["s"], half2: ["s", "h"] },
      jul: { half1: ["s", "h"], half2: ["s", "h"] },
      aug: { half1: ["h"], half2: ["h"] },
      sep: { half1: ["h"], half2: [] },
      oct: { half1: [], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 65,
    name: "Pumpkin",
    type: "vegetable",
    spacing: "48",
    daysToHarvest: "115-120",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: [] },
      apr: { half1: [], half2: ["s"] },
      may: { half1: ["s"], half2: ["s"] },
      jun: { half1: ["s"], half2: ["s"] },
      jul: { half1: ["s"], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: [], half2: ["h"] },
      oct: { half1: ["h"], half2: ["h"] },
      nov: { half1: ["h"], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 66,
    name: "Brussels Sprouts",
    type: "vegetable",
    spacing: "14-18",
    daysToHarvest: "T = 40-50, S = 90-100**",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: [] },
      apr: { half1: [], half2: [] },
      may: { half1: [], half2: ["si"] },
      jun: { half1: ["si"], half2: ["si"] },
      jul: { half1: ["si", "t"], half2: ["t"] },
      aug: { half1: ["t"], half2: ["t"] },
      sep: { half1: [], half2: [] },
      oct: { half1: [], half2: [] },
      nov: { half1: ["h"], half2: ["h"] },
      dec: { half1: ["h"], half2: ["h"] }
    }
  },
  {
    id: 67,
    name: "Rutabaga",
    type: "vegetable",
    spacing: "4",
    daysToHarvest: "70-80",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: ["s"], half2: ["s"] },
      mar: { half1: ["s"], half2: ["s"] },
      apr: { half1: ["s"], half2: [] },
      may: { half1: ["h"], half2: ["h"] },
      jun: { half1: ["h"], half2: [] },
      jul: { half1: ["s"], half2: ["s"] },
      aug: { half1: ["s"], half2: ["s"] },
      sep: { half1: ["s"], half2: ["s"] },
      oct: { half1: ["h"], half2: ["h"] },
      nov: { half1: ["h"], half2: ["h"] },
      dec: { half1: ["h"], half2: [] }
    }
  },
  {
    id: 68,
    name: "Garlic",
    type: "vegetable",
    spacing: "4-6",
    daysToHarvest: "B = 180-210",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: [] },
      apr: { half1: [], half2: [] },
      may: { half1: [], half2: [] },
      jun: { half1: ["h"], half2: ["h"] },
      jul: { half1: ["h"], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: [], half2: ["B"] },
      oct: { half1: ["B"], half2: ["B"] },
      nov: { half1: ["B"], half2: ["B"] },
      dec: { half1: ["B"], half2: [] }
    }
  },
  {
    id: 69,
    name: "Beans, Snap (Bush)",
    type: "vegetable",
    spacing: "4-6",
    daysToHarvest: "50-60",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: [] },
      apr: { half1: [], half2: ["s"] },
      may: { half1: ["s"], half2: ["s"] },
      jun: { half1: ["s", "h"], half2: ["h"] },
      jul: { half1: ["s", "h"], half2: ["s", "h"] },
      aug: { half1: ["s", "h"], half2: ["h"] },
      sep: { half1: ["h"], half2: ["h"] },
      oct: { half1: [], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 70,
    name: "Beans, Snap (Pole)",
    type: "vegetable",
    spacing: "6-8",
    daysToHarvest: "60-70",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: [] },
      apr: { half1: [], half2: ["s"] },
      may: { half1: ["s"], half2: ["s"] },
      jun: { half1: ["s"], half2: ["s", "h"] },
      jul: { half1: ["s", "h"], half2: ["s", "h"] },
      aug: { half1: ["s", "h"], half2: ["h"] },
      sep: { half1: ["h"], half2: ["h"] },
      oct: { half1: ["h"], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 71,
    name: "Asparagus",
    type: "vegetable",
    spacing: "12-18",
    daysToHarvest: "Perennial; 2-3 years to full harvest",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: ["t"] },
      mar: { half1: ["t"], half2: ["t"] },
      apr: { half1: ["t", "h"], half2: ["h"] },
      may: { half1: ["h"], half2: ["h"] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: [], half2: [] },
      oct: { half1: [], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 72,
    name: "Blueberries",
    type: "vegetable",
    spacing: "48-72",
    daysToHarvest: "Perennial",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: ["t"] },
      mar: { half1: ["t"], half2: ["t"] },
      apr: { half1: ["t"], half2: [] },
      may: { half1: [], half2: [] },
      jun: { half1: ["h"], half2: ["h"] },
      jul: { half1: ["h"], half2: ["h"] },
      aug: { half1: [], half2: [] },
      sep: { half1: [], half2: [] },
      oct: { half1: ["t"], half2: ["t"] },
      nov: { half1: ["t"], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 73,
    name: "Blackberries",
    type: "vegetable",
    spacing: "36-48",
    daysToHarvest: "Perennial",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: ["t"] },
      mar: { half1: ["t"], half2: ["t"] },
      apr: { half1: ["t"], half2: [] },
      may: { half1: [], half2: [] },
      jun: { half1: ["h"], half2: ["h"] },
      jul: { half1: ["h"], half2: ["h"] },
      aug: { half1: [], half2: [] },
      sep: { half1: [], half2: [] },
      oct: { half1: ["t"], half2: ["t"] },
      nov: { half1: ["t"], half2: ["t"] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 74,
    name: "Rosemary",
    type: "vegetable",
    spacing: "18-24",
    daysToHarvest: "Perennial",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: [] },
      apr: { half1: [], half2: ["t"] },
      may: { half1: ["t", "h"], half2: ["h"] },
      jun: { half1: ["h"], half2: ["h"] },
      jul: { half1: ["h"], half2: ["h"] },
      aug: { half1: ["h"], half2: ["h"] },
      sep: { half1: ["h"], half2: ["t", "h"] },
      oct: { half1: ["t"], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 75,
    name: "Thyme",
    type: "vegetable",
    spacing: "12-18",
    daysToHarvest: "Perennial",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: [] },
      apr: { half1: ["t"], half2: ["t", "h"] },
      may: { half1: ["h"], half2: ["h"] },
      jun: { half1: ["h"], half2: ["h"] },
      jul: { half1: ["h"], half2: ["h"] },
      aug: { half1: ["h"], half2: ["h"] },
      sep: { half1: ["h"], half2: ["t", "h"] },
      oct: { half1: ["t"], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 76,
    name: "Oregano",
    type: "vegetable",
    spacing: "12-18",
    daysToHarvest: "Perennial",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: [] },
      apr: { half1: ["t"], half2: ["t", "h"] },
      may: { half1: ["h"], half2: ["h"] },
      jun: { half1: ["h"], half2: ["h"] },
      jul: { half1: ["h"], half2: ["h"] },
      aug: { half1: ["h"], half2: ["h"] },
      sep: { half1: ["h"], half2: ["t", "h"] },
      oct: { half1: ["t"], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 77,
    name: "Mint",
    type: "vegetable",
    spacing: "12-18",
    daysToHarvest: "Perennial",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: ["t"], half2: ["t"] },
      apr: { half1: ["t", "h"], half2: ["h"] },
      may: { half1: ["h"], half2: ["h"] },
      jun: { half1: ["h"], half2: ["h"] },
      jul: { half1: ["h"], half2: ["h"] },
      aug: { half1: ["h"], half2: ["h"] },
      sep: { half1: ["h"], half2: ["t", "h"] },
      oct: { half1: ["t"], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  }
];
// Plant Guide Data - integrated from carrboro_plant_guide.csv

const PLANT_GUIDE = {
    "Sunflower": {
      varietiesText: `Classic tall (Mammoth), pollenless (ProCut, for cut flowers), dwarf (Teddy Bear, Sunspot), multi-branching (Autumn Beauty, Lemon Queen)`,
      tipsText: `Direct sow after frost. Prefers full sun and well-drained soil. Space for large heads. Stake tall varieties. Attracts pollinators and birds. Harvest seeds when back of head turns yellow.`
    },
  "Arugula": {
    varietiesText: `Astro (fast, mild), Rocket (classic), Sylvetta (wild/perennial, peppery)`,
    tipsText: `Rich soil improves leaf size. Consistent moisture prevents bitterness. Light shade extends harvest. Harvest outer leaves first for cut-and-come-again.`
  }, 
  "Lettuce, Head": {
    varietiesText: `Dano (red romaine, Piedmont favorite +++), Winter Density (Bibb-Romaine cross, cold hardy), Rouge d'Hiver (red, cold hardy), Buttercrunch (reliable butterhead), Jericho (heat tolerant romaine), Muir (Batavian, heat tolerant)`,
    tipsText: `Loose soil + compost for good heads. Mulch to cool roots. Avoid excess nitrogen late in growth. Red/high-anthocyanin varieties have better cold tolerance. Seed goes dormant in hot soil—refrigerate seeds 2 days before summer sowing.`
  }, 
  "Radishes": {
    varietiesText: `Hakurei (salad turnip—sweet, eaten raw +++), French Breakfast (mild, elongated), Easter Egg (color mix), Cherry Belle (classic), Daikon (large, mild)`,
    tipsText: `Keep soil evenly moist to prevent pithy roots. Thin early for size. Add potassium for best flavor. Interplant between slower crops to maximize space.`
  }, 
  "Lettuce, Leaf": {
    varietiesText: `Merlot (darkest red, cold hardy), New Red Fire (heat tolerant), Red Sails (slow bolt), Green Star (reliable), Oakleaf/Tango (heat tolerant)`,
    tipsText: `Harvest outer leaves only for continuous production. Mulch to reduce heat stress. Tolerates partial shade. Red varieties have superior cold hardiness and mold resistance. Seed goes dormant in hot soil.`
  }, 
  "Onions, Green": {
    varietiesText: `Evergreen Hardy White (perennial), White Lisbon (classic), Warrior (vigorous bunching), Tokyo Long White (mild)`,
    tipsText: `Shallow planting keeps stems tender. Steady nitrogen improves leaf growth. Can plant thickly and harvest as scallions.`
  }, 
  "Spinach": {
    varietiesText: `Space (smooth leaf, fast, mildew resistant), Tyee (semi-savoy, upright, overwintering standard), Bloomsdale (savoy, best flavor—better for fall), Olympia (smooth, rapid)`,
    tipsText: `High organic matter boosts leaf size. Mulch for soil moisture. Smooth-leaf types easier to clean and less prone to rot. Upright varieties keep leaves off soil. pH 6.5-7.0 preferred. For winter harvests, aim to have plants near maturity by mid-November before day length drops into the Persephone period.`
  }, 
  "Celery": {
    varietiesText: `Utah Tall (classic flavor), Tango (compact, bolt resistant), Ventura (heat tolerant)`,
    tipsText: `Heavy feeder—amend with compost + calcium. Constant moisture essential. Blanch stalks by hilling soil or using collars for milder flavor.`
  }, 
  "Onions, Bulb": {
    varietiesText: `Candy (sweet, intermediate day), Patterson (storage, intermediate), Texas Legend (short day), Red Creole (short day, stores well)`,
    tipsText: `Use intermediate or short-day varieties for NC—avoid long-day types. Starting from seed superior to sets (sets often bolt). Heavy feeders. Well-drained soil critical. Phosphorus at planting helps bulb development.`
  }, 
  "Leek": {
    varietiesText: `King Richard (fast, tender), Lancelot (disease resistant), Megaton (large), Bandit (winter hardy)`,
    tipsText: `Hill soil up stems to blanch. Rich soil improves diameter. Heavy feeder. Consistent moisture throughout growth.`
  }, 
  "Kale": {
    varietiesText: `Lacinato Rainbow (cold/heat tolerant, anthocyanin-rich +++), Red Ursa (frilly, tender, very cold hardy, late bolt +++), Vates (dwarf curly, very cold hardy), Lacinato/Toscano (upright habit), Red Russian (tender), Winterbor (curly, cold hardy), Redbor (tall)`,
    tipsText: `Remove lower leaves for airflow. Tolerates poor soil but thrives with compost. Flavor sweetens after frost. Bt for cabbage worms. Russian/Siberian types stay tender longer. Tall varieties reduce bottom rot. Use floating row covers to exclude pests. For dependable winter picking, get plants close to mature size by mid-November before growth slows sharply in low light.`
  }, 
  "Collard Greens": {
    varietiesText: `Senposai (cabbage/mustard cross, massive yield—must grow +++), Champion (slow to bolt), Flash (hybrid, fast regrowth), Georgia Southern (heirloom, heat tolerant), Morris Heading (forms loose heads)`,
    tipsText: `Extremely forgiving. Harvest outer leaves continuously. Responds well to nitrogen. Bt for caterpillars. Flavor improves dramatically after frost.`
  }, 
  "Bok Choy": {
    varietiesText: `Joi Choi (bolt resistant, huge white stalks), Mei Qing Choi (baby, green stem), Win-Win Choi (heat tolerant)`,
    tipsText: `Loose soil prevents root stress. Mulch keeps stems tender. Consistent moisture essential. Floating row cover for flea beetles. Extremely bolt-sensitive to temperature swings.`
  }, 
  "Lavender": {
    varietiesText: `English Munstead (Southern Exposure, compact culinary type), English/Vera (Sow True, classic fragrant type)`,
    tipsText: `Treat lavender like a Mediterranean perennial: full sun, sharp drainage, and lean soil. Sow True and Southern Exposure both reinforce slow germination, stratification, and excellent drainage; in humid NC, avoid crowding and keep mulch away from the crown.`
  }, 
  "Yarrow": {
    varietiesText: `White Yarrow (Sow True, classic medicinal/pollinator type)`,
    tipsText: `Press seed onto the surface or barely cover it, since light helps germination. Sow True notes that yarrow spreads by rhizomes and self-seeding, so give it a permanent, well-drained spot and divide clumps in spring or fall if it runs.`
  }, 
  "Chives": {
    varietiesText: `Common chives (reliable), Garlic chives (flat leaves, garlic flavor), Profusion (sterile, no reseeding)`,
    tipsText: `Divide every few years to maintain vigor. Prefers well-drained soil. Low maintenance perennial. Deadhead to prevent unwanted spreading.`
  }, 
  "Snap Pea (Bush)": {
    varietiesText: `Sugar Ann (compact, early), Cascadia (disease resistant), Little Marvel (sweet)`,
    tipsText: `Inoculate seed with rhizobia for nitrogen fixation. Keep roots cool with mulch. No support needed but small trellis helps keep pods clean. Pick frequently.`
  }, 
  "Snap Pea (Pole)": {
    varietiesText: `Super Sugar Snap (classic, vigorous), Sugar Snap (original variety), Mammoth Melting Sugar (large pods)`,
    tipsText: `Trellis (6'+) improves airflow and yield. Pick often to extend production. Inoculate seeds. Add phosphorus at planting.`
  }, 
  "Peas, Vining": {
    varietiesText: `Oregon Sugar Pod (snow pea), Alderman/Tall Telephone (heirloom shelling), Wando (shelling, heat tolerant), Lincoln (sweet, disease resistant)`,
    tipsText: `Nitrogen fixation improves soil for following crops. Trellising reduces mildew. Consistent moisture especially at flowering. Mulch to keep roots cool. Inoculate seeds.`
  }, 
  "Peas, Bush": {
    varietiesText: `Little Marvel (sweet, compact), Green Arrow (shelling, disease resistant), Tom Thumb (containers)`,
    tipsText: `Even moisture improves pod fill. No heavy nitrogen needed—peas fix their own. Inoculate seeds. Great for intensive planting.`
  }, 
  "Mustard": {
    varietiesText: `Giant Red Mustard (trap crop for flea beetles, spicy), Mizuna (mild, feathery), Florida Broadleaf (large), Southern Giant Curled (classic), Tatsoi (rosette, very cold tolerant)`,
    tipsText: `Cut young for best flavor. Tolerates poor soil. Self-sows readily. Giant Red Mustard works as trap crop to lure flea beetles away from other brassicas.`
  }, 
  "Parsley": {
    varietiesText: `Italian Flat Leaf (best flavor), Titan (vigorous flat leaf), Moss Curled (decorative)`,
    tipsText: `Deep roots benefit from loose soil. Cut outer stems to regrow. Soak seeds overnight—slow to germinate. Heavy nitrogen feeder. Biennial.`
  }, 
  "Chard, Swiss": {
    varietiesText: `Fordhook Giant (green, most cold/heat tolerant), Bright Lights (colorful, less hardy), Peppermint (pink stems)`,
    tipsText: `Mulch deeply. Remove outer leaves for continuous production. Highly heat tolerant—produces spring through fall. Heavy nitrogen feeder.`
  }, 
  "Carrots": {
    varietiesText: `Napoli (sweetens after frost, colors early in low light), Scarlet Nantes (superior flavor ++), Purple Dragon (purple exterior), Danvers 126 (good for heavy soil), Chantenay (short—heavy clay soil)`,
    tipsText: `Deeply loosened soil essential—forking common in clay. Thin aggressively for straight roots. Cover seeded rows with board or burlap to retain moisture until germination (14-21 days). Add potassium for flavor.`
  }, 
  "Peppers": {
    varietiesText: `Carmen (bull's horn, early, sweeter than bells ++), Early Pimiento (very early, thick walls +++), Flavorburst (yellow bell), California Wonder (classic bell), Jalapeño Early (reliable hot), Jalafuego (hot), Olympus (sweet)`,
    tipsText: `Mulch + calcium (bone meal/gypsum) prevent blossom end rot. Stake early. Avoid excess nitrogen. Consistent watering. Don't plant in cold wet clay—stunts roots permanently.`
  }, 
  "Tomatoes": {
    varietiesText: `Mountain Girl (compact, only variety to score perfect 5 in local taste test—Wild Mountain Seeds), Mountain Regina (highest producer in Durham trials, compact form), Lemon Boy Plus (most reliable/resilient in 2025 trial, long season), Better Boy Plus (resilient, 124-day harvest), Celebrity Plus (last standing in Briggs trial, excellent disease resistance), Carbon (black, largest fruit, excellent complex flavor), Rose de Berne (pink, crack resistant +++), Cherokee Purple (NC heirloom, superior flavor—prone to cat-facing/cracking), Sun Gold (cherry, high sugar), Mountain Magic/Fresh (NCSU, blight resistant)`,
    tipsText: `Prune lower leaves for airflow. Mulch heavily. Consistent watering critical to prevent cracking. Deep transplanting—bury 2/3 of stem. Single-leader pruning essential for disease-prone heirlooms. Add calcium. Cherokee Purple prone to cat-facing (cold damage) and concentric cracking—needs extra airflow. Grafting onto disease-resistant rootstock (RST, DRO) extends season—keep graft union ABOVE soil. Celebrity Plus, Mountain Girl, and Mountain Magic/Fresh are strong disease-resilient choices for humid late-summer Piedmont conditions.`
  }, 
  "Strawberries (Bare-root)": {
    varietiesText: `Chandler (NC Piedmont standard), Seascape (Sow True, productive day-neutral), Sparkle (Sow True, strong flavor for jam/freezing), Albion (Sow True, large everbearing), Ozark Beauty (Sow True, prolific everbearing)`,
    tipsText: `Full sun. Plant bare-root crowns with the crown exactly at soil level. In the Piedmont, fall planting is the stronger choice for spring-bearing systems, while spring bare-root planting is more of an establishment play than a full-yield setup. Sow True's offerings skew toward everbearing/day-neutral types plus Sparkle; use Chandler for classic Piedmont spring production, or Seascape and Albion for longer picking windows and container growing.`
  }, 
  "Potatoes (Irish)": {
    varietiesText: `Kennebec (standard white, disease resistant), Yukon Gold (buttery, early), Red Pontiac (waxy)`,
    tipsText: `Hill soil to prevent greening. Loose soil improves tuber size. Use certified seed potatoes. Use straw mulch to protect shoots from late frost. Cure before storage. Rotate planting location annually.`
  }, 
  "Eggplant": {
    varietiesText: `Orient Express (Asian, early, cool-tolerant), Ping Tung (long Asian, tender), Ichiban (long, productive), Nadia (black, productive), Black Beauty (classic), Fairy Tale (small, tender)`,
    tipsText: `Stake early. Remove early flowers for vigor. Loves heat + compost. Harvest when skin is glossy (dull = overripe). Flea beetles riddle leaves—use insect netting or row cover until plants are large enough to withstand damage.`
  }, 
  "Calendula": {
    varietiesText: `Resina (Sow True + Southern Exposure, high resin content), Pacific Beauty (Sow True + Southern Exposure, long-stemmed mix), Erfurter Orange (Sow True, heavy orange production)`,
    tipsText: `Calendula performs best here as a cool-shoulder flower. Sow True and Southern Exposure both note that it fades in deep summer heat and can be reseeded for fall bloom; deadhead hard for repeat flowering and harvest petals just after opening for tea, salves, or edible use.`
  }, 
  "Cabbage": {
    varietiesText: `Early Jersey Wakefield (heirloom, pointed, overwinters well), Bravo (disease resistant), Stonehead (compact, disease resistant), Green Acre (reliable)`,
    tipsText: `Firm soil improves heads. Row cover deters worms. Steady moisture prevents splitting. Heavy feeder—amend with compost and nitrogen-rich fertilizer. Bt for caterpillars (cabbage loopers ubiquitous).`
  }, 
  "Broccoli": {
    varietiesText: `Packman (early, productive), Arcadia (cold tolerant), Belstar (heat tolerant, disease resistant), Green Magic (widely adapted), Waltham 29 (side shoots)`,
    tipsText: `Harvest main head early to encourage side shoots. Heavy feeder—amend with nitrogen-rich fertilizer. Consistent moisture. Bt for worms. Side-shoot varieties extend harvest significantly.`
  }, 
  "Cauliflower": {
    varietiesText: `Snow Crown (easiest for beginners), Amazing (self-blanching), Snowball (classic), Cheddar (orange, heat tolerant), Graffiti (purple)`,
    tipsText: `Consistent moisture critical. Blanch heads if sun-sensitive by tying leaves over head. Heavy feeder. Self-blanching varieties reduce labor.`
  }, 
  "Basil": {
    varietiesText: `Genovese (classic pesto), Prospera (downy mildew resistant), Eleonora (mildew resistant), Italian Large Leaf (productive), Thai (spicy, heat tolerant)`,
    tipsText: `Pinch frequently for bushier plants. Good drainage prevents rot. Choose mildew-resistant varieties—downy mildew is common in humid conditions.`
  }, 
  "Kohlrabi": {
    varietiesText: `Winner (white, tender), Early White Vienna (quick), Kolibri (purple, sweet), Kossak (giant, stays tender)`,
    tipsText: `Harvest young for tenderness (2-3" except Kossak). Consistent moisture prevents woodiness.`
  }, 
  "Fennel": {
    varietiesText: `Orion (bolt resistant, large bulbs), Florence (classic), Zefa Fino (quick, reliable)`,
    tipsText: `Deep soil for bulbs. Avoid disturbance once established. Direct sow preferred—doesn't transplant well. Harvest bulb when 3" across.`
  }, 
  "Cilantro": {
    varietiesText: `Santo (slow bolt), Calypso (very slow bolt), Caribe (large leaves, bolt resistant)`,
    tipsText: `Succession sowing extends harvest. Partial shade reduces bolting. Let some bolt for coriander seed harvest. Bolts instantly in heat—cool season only.`
  }, 
  "Turnips": {
    varietiesText: `Hakurei (Japanese salad turnip, eat raw +++), Purple Top White Globe (traditional), Scarlet Queen (red, quick)`,
    tipsText: `Loose soil improves root shape. Mulch for sweetness. Greens are edible and nutritious. Harvest roots small for best texture.`
  }, 
  "Sage": {
    varietiesText: `Broad Leaf Culinary (Sow True), Common culinary sage (Southern Exposure type), Berggarten (large leaves, rarely flowers), Tricolor (ornamental, edible)`,
    tipsText: `Excellent drainage matters more than fertilizer. Sow True and Southern Exposure both position culinary sage as a sun-loving perennial herb for lean, well-drained soil; shear lightly after bloom and avoid wet feet in clay.`
  }, 
  "Echinacea": {
    varietiesText: `Purple Coneflower (Sow True, straight Echinacea purpurea)`,
    tipsText: `Cold stratification improves germination. Sow True treats echinacea as a long-game perennial: loose, well-drained soil, full sun, drought tolerance once established, and the strongest bloom display beginning in year two.`
  }, 
  "Parsnips": {
    varietiesText: `Hollow Crown (heirloom, large), Lancer (sweet, uniform), Harris Model (shorter, faster)`,
    tipsText: `Deep loose soil essential. Very slow germination (14-21 days)—cover rows with board/burlap to retain moisture. Tastes significantly better after hard frost—leave in ground. Can overwinter.`
  }, 
  "Dill": {
    varietiesText: `Bouquet (quick, good for pickles), Fernleaf (compact, slow bolt), Mammoth (tall), Dukat (leafy, excellent flavor)`,
    tipsText: `Direct sow preferred—doesn't transplant well. Attracts beneficial insects. Self-sows readily. Tall varieties may need staking. Bolts in heat—cool season only.`
  }, 
  "Beets": {
    varietiesText: `Detroit Dark Red (classic, reliable), Early Wonder (quick), Chioggia (candy striped, mild), Bull's Blood (deep red, great greens), Touchstone Gold (doesn't bleed)`,
    tipsText: `Thin early—seed is a cluster. Steady moisture improves size and sweetness. Greens are edible and nutritious. Add boron for healthy roots.`
  }, 
  "Ginger": {
    varietiesText: `Yellow Ginger Rhizomes (Sow True), Chinese Yellow (vigorous), Bubba (large rhizomes). Note: Grocery store ginger is often treated to prevent sprouting—buy seed rhizomes when possible.`,
    tipsText: `Pre-sprout rhizomes warm 6-8 weeks before last frost. Sow True and Southern Exposure both describe ginger as a heat-loving crop that benefits from a warm start, rich mix, regular feeding, and either large pots or loose compost-rich ground; harvest before first frost for best quality and to avoid rhizome damage.`
  }, 
  "Moonflower": {
    varietiesText: `Moonflower (Sow True, white fragrant evening-blooming vine)`,
    tipsText: `Scarify or nick seeds and soak before sowing. Sow True emphasizes warm soil, full sun, steady moisture at establishment, and a strong trellis; it is more reliable here when given real heat and vertical support.`
  }, 
  "Cabbage (Chinese)": {
    varietiesText: `Blues (Napa, disease resistant), Napa Michihili (tall), Wong Bok (barrel-shaped), Rubicon (mini), Tokyo Bekana (loose head, bolt resistant)`,
    tipsText: `Loose soil prevents splitting. Consistent moisture essential. Floating row cover for flea beetles. Extremely bolt-sensitive to temperature swings. Grows fast even in low light.`
  }, 
  "Squash (Summer)": {
    varietiesText: `Green Light (high-yield zucchini, tender skin), Zephyr (bicolor crookneck, nutty), Costata Romanesco (ribbed zucchini, best flavor), Success PM (powdery mildew resistant), Dunja (zucchini, mildew tolerant), Tatume/Calabacita (vining, vine borer resistant)`,
    tipsText: `Powdery mildew resistant varieties important. Harvest frequently at 6-8". Good airflow matters. Row covers until flowering for vine borer protection—must remove or hand-pollinate when flowers appear.`
  }, 
  "Cucumbers": {
    varietiesText: `Summer Dance (Asian/snack type, crisp in heat), Marketmore 76 (slicing, disease resistant), Diva (sweet, seedless, spineless), General Lee (slicing), Calypso (pickling), Socrates (parthenocarpic—no pollination needed)`,
    tipsText: `Trellis for airflow and straight fruit. Consistent moisture prevents bitterness. Harvest daily at peak. Row cover early for cucumber beetles. Parthenocarpic varieties ideal for enclosed growing. Summer Dance is a strong hot-weather choice when you want crisp, low-bitterness fruit. Water at base—never overhead—to prevent downy mildew.`
  }, 
  "Zinnias": {
    varietiesText: `State Fair Mix (Sow True + Southern Exposure, tall cut flower), Thumbelina Mix (Sow True, dwarf border type), Persian Carpet (Sow True, compact heat-lover), Cherry Queen (Sow True, tall red cut flower)`,
    tipsText: `Direct sowing is usually easiest. Sow True and Southern Exposure both emphasize heat, sun, spacing, and repeated cutting or deadheading; keep airflow high in humid weather to reduce mildew and sow short successions for longer bloom.`
  }, 
  "Nasturtium": {
    varietiesText: `Dwarf Jewel Mix (Sow True, compact edible mix), Peach Melba Dwarf (Sow True, bush type), Empress of India (Sow True, dark foliage)`,
    tipsText: `Scarify seed for faster sprouting. Sow True's dwarf lines fit beds and containers better than trailing strains; don't overfeed or you will get more leaves than flowers. Leaves and flowers are edible with a peppery watercress flavor.`
  }, 
  "Corn (Sweet)": {
    varietiesText: `Bolt (sh2, better cold-soil emergence), Silver Queen (white, classic SU), Ambrosia (bicolor, excellent SE), Bodacious (SE, sweet), Incredible (sugary enhanced), Peaches and Cream (bicolor)`,
    tipsText: `Heavy feeder—side dress when knee high. Block planting (not single rows) essential for pollination. Consistent moisture at tasseling critical. Do not plant super-sweet (sh2) near standard types—cross-pollination turns kernels starchy. Super-sweet corn should wait for 4-inch soil temperatures above 60°F; Bolt is a better option than most sh2 types when spring soil is still cold and wet.`
  }, 
  "Cantaloupe": {
    varietiesText: `Athena (disease resistant, firm, commercial standard), Ambrosia (exceptional flavor), Sugar Cube (personal size, mildew resistant)`,
    tipsText: `Needs heat. Mulch conserves moisture (black plastic warms soil). Reduce watering as fruit ripens for sweetness. Harvest at slip stage. Water at base to keep leaves dry—downy mildew common.`
  }, 
  "Squash (Winter)": {
    varietiesText: `Waltham Butternut (classic, vine borer resistant), Seminole Pumpkin (very disease/heat tolerant), Delicata (quick, sweet), Honeynut (mini butternut, exceptional flavor)`,
    tipsText: `Long vines need space. Very disease tolerant varieties available. Minimal pruning needed. Cure in sun 10 days after harvest. Leave 2" stem. Store at 50-55°F.`
  }, 
  "Potatoes (Sweet)": {
    varietiesText: `Covington (NC standard, high yield, disease resistant), Beauregard (orange, reliable), O'Henry (white, sweet)`,
    tipsText: `Loose soil improves root formation. Vines sprawl aggressively. Build ridges for easy harvest. Cure at high heat/humidity (85°F) for a week after harvest to convert starch to sugar. Store at 55-60°F.`
  }, 
  "Peas (Field)": {
    varietiesText: `Whippoorwill (Southern Exposure, classic drought-tolerant heirloom), Big Red Ripper/Mandy (Southern Exposure, VA/NC heirloom), Iron & Clay (heat-tolerant cowpea), Pinkeye Purple Hull (Southern staple)`,
    tipsText: `Treat these as southern peas or cowpeas, not spring English peas. Southern Exposure's heirlooms reinforce the role of this crop in hot weather: sow only into warm soil, skip excess nitrogen, and use them as both a reliable summer food crop and a tough soil-building legume.`
  }, 
  "Lima Bean (Pole)": {
    varietiesText: `King of the Garden (heirloom, large), Christmas/Large Speckled (flavorful)`,
    tipsText: `Requires sturdy 8' trellis. Long season. Heat tolerant. Pick when pods are plump but before yellowing. Dust seeds with rhizobium inoculant.`
  }, 
  "Watermelon": {
    varietiesText: `Crimson Sweet (classic, disease resistant), Sugar Baby (icebox size), Moon and Stars (heirloom, beautiful), Charleston Gray (oblong, wilt resistant)`,
    tipsText: `Needs heat. Consistent moisture prevents splitting. Black plastic mulch beneficial. Thump test—deep hollow sound. Tendril near fruit dries when ripe. Water at base to prevent downy mildew.`
  }, 
  "Okra": {
    varietiesText: `Clemson Spineless (standard, reliable), Red Burgundy (ornamental and edible), Hill Country Red (productive), Jambalaya (compact)`,
    tipsText: `Loves heat. Soak seeds 12 hours to speed germination. Harvest pods small (3-4") for tenderness—large pods become woody. Harvest every 1-2 days. Cut rather than pull pods.`
  }, 
  "Lima Bean (Bush)": {
    varietiesText: `Henderson (baby lima, quick, reliable), Fordhook 242 (large, heat tolerant), Dixie Butterpea (Southern heirloom)`,
    tipsText: `Compact. Reliable yields. Moderate feeding. Pick when pods are plump. Needs consistent moisture at flowering. Dust seeds with rhizobium inoculant.`
  }, 
  "Pumpkin": {
    varietiesText: `Small Sugar/New England Pie (small, sweet flesh), Connecticut Field (classic jack-o-lantern), Jarrahdale (blue, excellent flavor), Long Island Cheese (tan, cooking)`,
    tipsText: `Allow space—vines sprawl. Watch for squash vine borers. Slip board under developing fruit to prevent rot. Cure in sun. Leave 4" stem.`
  }, 
  "Brussels Sprouts": {
    varietiesText: `Diablo (uniform, productive), Jade Cross (heat tolerant, reliable), Gustus (sweet), Long Island Improved (heirloom, hardy)`,
    tipsText: `Difficult in NC due to heat. Stake tall plants. Remove lower leaves for airflow. Flavor improves dramatically after frost. Top plant 3-4 weeks before expected harvest to speed maturity.`
  }, 
  "Rutabaga": {
    varietiesText: `American Purple Top (classic, yellow flesh, sweet), Laurentian (large, smooth), Joan (quick)`,
    tipsText: `Loose soil improves roots. Steady moisture critical. Thin to 6". Tastes significantly better after hard frost—leave in ground. Can overwinter with heavy mulch.`
  }, 
  "Garlic": {
    varietiesText: `German Extra Hardy (hardneck, excellent flavor, surprisingly good in NC), Inchelium Red (softneck, stores well), Lorz Italian (softneck, mild), Chesnok Red (roasting)`,
    tipsText: `Mulch heavily. Needs winter cold to divide into bulbs. Remove scapes for bulb size (hardneck types). Harvest when lower 3-4 leaves brown. Cure 2-4 weeks in dry shade. Heavy feeder.`
  },
  "Beans, Snap (Bush)": {
    varietiesText: `Provider (reliable, early), Contender (heat tolerant), Maxibel (slender filet), Jade (dark green, slow seed development)`,
    tipsText: `Direct sow into warm soil. Succession sow every 2-3 weeks for a longer run. Pick often to keep plants producing. Avoid handling wet foliage in humid weather to limit disease spread.`
  },
  "Beans, Snap (Pole)": {
    varietiesText: `Kentucky Wonder (classic heirloom), Blue Lake Pole (productive), Fortex (long, slender filet), Rattlesnake (heat tolerant, purple-striped pods)`,
    tipsText: `Give pole beans a real trellis before sowing. They yield longer than bush beans but start later. Pick frequently and keep vines watered evenly through flowering for better pod set.`
  },
  "Asparagus": {
    varietiesText: `Jersey Knight (widely adapted), Jersey Supreme (productive), Millennium (excellent flavor), Purple Passion (purple spears, sweeter raw)`,
    tipsText: `Treat this as a permanent bed crop. Plant crowns in deep, well-drained soil, feed steadily, and let fern growth mature after harvest so the planting can recharge. Do not harvest heavily until the stand is established.`
  },
  "Blueberries": {
    varietiesText: `Legacy (southern highbush, excellent flavor), O'Neal (early southern highbush), Brightwell (rabbiteye, reliable), Powderblue (late rabbiteye)`,
    tipsText: `Blueberries need acidic soil, usually far more acidic than a vegetable bed. Use pine-bark-amended beds or containers if native pH is too high, mulch heavily, and plant at least two compatible cultivars for better fruit set.`
  },
  "Blackberries": {
    varietiesText: `Ouachita (thornless, reliable), Navaho (thornless, firm fruit), Apache (large fruit), Prime-Ark Freedom (primocane-fruiting)`,
    tipsText: `Full sun and airflow matter. Trellising improves harvest and cane management, and post-harvest pruning is a core part of the crop. These rows focus on planting and harvest windows, not the full pruning calendar.`
  },
  "Rosemary": {
    varietiesText: `Arp (cold tolerant), Hill Hardy (winter hardy), Tuscan Blue (upright), Salem (compact culinary type)`,
    tipsText: `Good drainage matters more than fertility. In Piedmont clay, rosemary is safer on a mound, raised bed, or in a large pot. Harvest lightly the first season, then shear tips often to keep plants dense.`
  },
  "Thyme": {
    varietiesText: `English Thyme (classic culinary), German Winter (hardy), Lemon Thyme (citrus note), French Thyme (fine texture)`,
    tipsText: `Keep thyme lean and well drained. It hates wet crowns and excess fertilizer. Shear lightly after bloom or heavy harvest to prevent woody open centers.`
  },
  "Oregano": {
    varietiesText: `Greek Oregano (best culinary flavor), Italian Oregano (vigorous), Hot and Spicy (strong flavor), Syrian Oregano/Za'atar type (more upright)`,
    tipsText: `Oregano thrives in sun and average soil. Flavor is strongest when growth stays compact rather than lush, so avoid heavy feeding. Cut stems before flowering for the best culinary quality.`
  },
  "Mint": {
    varietiesText: `Spearmint (classic tea/cocktail mint), Peppermint (strong menthol), Mojito Mint (milder), Chocolate Mint (dessert use)`,
    tipsText: `Contain it. Mint spreads aggressively in open ground, so a pot or sunk barrier is usually the better choice. Keep moisture steady and cut it hard through summer to keep fresh tender growth coming.`
  }
};

const PLANT_REVIEW_NOTES = {
  "Arugula": "Kept this as a cool-season direct-sow crop. NC State Central NC shows sowing in Feb-Mar and Aug-Sep; I removed the winter greenhouse timing because the Piedmont sources did not justify it.",
  "Lettuce, Head": "I moved fall lettuce transplanting earlier. The Piedmont guide supports an early fall establishment window beginning in mid-August with season extension, so V2 now adds outdoor transplanting in late August and early September, marks those slots with `*` for heat-management during establishment, and keeps only very small protected-culture shoulders: late February for spring sowing under cover and October for protected late-fall succession.",
  "Radishes": "I tightened this back to a true spring/fall radish pattern. The broad May-June sowing run was too optimistic for Piedmont quality, so V2 now ends spring around early April and extends the main fall window into early October instead.",
  "Lettuce, Leaf": "Leaf lettuce now mirrors the earlier fall-establishment logic used for head lettuce. The August-to-early-September transplant slots remain active, but they now also carry `*` to signal that heat management matters during establishment. I also restored narrow `sg` shoulders in late February and October because protected baby-leaf succession is easier to support there than broad winter outdoor sowing.",
  "Onions, Green": "I converted this away from a seed-led row and toward sets. The Piedmont guide is clearer here than the earlier mixed interpretation, so V2 now uses `B` for the spring and late-summer planting windows instead of broad `s` timing.",
  "Spinach": "I tightened spinach into a more realistic cool-season row. The old May-June outdoor sowing run was too broad, so V2 now drops those slots, keeps the mid-August establishment restart with `*`, and restores explicit outdoor sowing in late October and early November for overwinter spinach, alongside protected-culture support. The November sow slot is flagged as overwintering intent, not a same-fall harvest move.",
  "Celery": "Converted this to a transplant-led schedule. NC State lists outdoor planting primarily as transplant timing; indoor starts were added ahead of those windows because direct sow is not realistic here.",
  "Onions, Bulb": "This was one of the biggest corrections. Instead of treating bulb onions like a near year-round sowing crop, V2 now separates the real seed windows from the transplant window: seed in fall and late winter, start seedlings in December-January, and transplant from mid-February into early spring. The early-February slot is now marked with `tg` plus `*` to show that it is a protection-dependent transplant window rather than a normal open-field move.",
  "Leek": "Treated as a transplant-oriented allium with spring S/T timing from the Central NC calendar. Indoor starts were limited to the lead-in for those transplant windows.",
  "Kale": "Tightened this into a cool-season spring and fall crop. Central NC supports S/T in late winter-spring and again late summer-fall; the remaining fall `sg` slots are only a protected-culture shoulder for early winter, not part of the core outdoor window.",
  "Collard Greens": "Rebuilt this from the NC State Central NC collard row. Spring is transplant-led from late February through June, with a July-September fall S/T window; the fall `sg` slots are only a modest season-extension shoulder for protected greens.",
  "Bok Choy": "Narrowed this sharply. The NC State Central NC calendar shows bok choy mainly as a transplant crop in late March and again late August through September; the remaining `tg` slots are only a small fall protected-culture shoulder rather than part of the main transplant window, with the outer edge extending into early October under cover.",
  "Snapdragons": "I widened this beyond the old spring-only row. Clemson and NC Extension both treat snapdragons as cool-season plants that can be set out in fall as well as late winter or early spring, so V2 now keeps the spring indoor-start lane but also adds a fall transplant window from September into early October instead of pretending this is only a spring annual.",
  "Lavender": "I tightened this with Johnny's plus UGA herb guidance. Johnny's recommends starting lavender 8-10 weeks before last frost and transplanting after last frost, while UGA lists lavender as a spring/fall perennial herb in the South, so V2 now uses a later spring set-out and a narrower fall transplant window.",
  "Stock": "Narrowed this to a spring indoor-start and spring transplant pattern. Johnny's places stock at about 5-6 weeks before frost-free transplanting, and I removed the unsupported fall direct-sow entry rather than pretending the local source stack supports a second season here.",
  "Chives": "Left this mostly intact and slightly broadened spring transplanting. Johnny's and Southern herb guidance support chives as a perennial herb typically started for spring set-out, but they do not give a strong Carrboro half-month calendar, so V2 keeps the conservative late-winter seed-start and early-spring transplant pattern.",
  "Snap Pea (Bush)": "Removed the speculative greenhouse lead-in and widened outdoor sowing to match the NC State pea calendar for spring. For fall, V2 is now more skeptical: the August sowing slot was removed, and September sowing remains only with `*` because Piedmont fall peas are technically possible but unreliable in hot-soil years.",
  "Snap Pea (Pole)": "Aligned this with the NC State vining-pea row and removed greenhouse bias. Spring timing stays intact, but the fall pea lane is now reduced to September only and marked with `*` to reflect the real reliability problem in the Piedmont.",
  "Peas, Vining": "Expanded this to the full NC State outdoor sowing window and removed the greenhouse placeholder. After review, the fall sowing lane is now reduced to September only and carries `*`, since fall peas in the Piedmont are often too unreliable to present as a normal August start.",
  "Peas, Bush": "Same adjustment as other peas: no greenhouse placeholder, broader direct-sow timing from the NC State calendar for spring, but a more conservative fall lane. August sowing is removed and September sowing is flagged with `*` because fall peas are a marginal Piedmont move rather than a dependable one.",
  "Mustard": "Rebuilt this around the NC State Central NC mustard row. V2 removes the winter greenhouse assumption and uses a long direct-sow run from late winter into mid-June, plus the late-summer/early-fall sowing cycle.",
  "Parsley": "I kept parsley's spring and fall S/T structure, but the September half1 slot is now explicitly marked as a primary fall planting point and carries `*` to indicate the crop's summer slowdown and fall reflush behavior. The protected fall shoulder now runs one extra half-slot into late November, but it remains a modest herb extension rather than a full winter production lane.",
  "Chard, Swiss": "Aligned this to the NC State Swiss chard row: spring S/T from March into April, then a fall cycle in August and early September. I added a narrow `si` lead-in ahead of those transplant windows because Swiss chard is commonly started 5-6 weeks before set-out, and I kept only a small fall `sg` window for protected cool-season greens that trails into mid-November.",
  "Carrots": "I reclassified the hottest part of carrot season. V2 now starts the fall-sowing lane earlier, in late June and early July, but keeps those early slots flagged with `*` because they are heat-managed establishment rather than easy sowings. The October edge remains the overwintering side of the row, not the main fall-harvest start, so the added late-October `sg` slot is only a protected overwinter shoulder.",
  "Peppers": "Kept peppers as a transplant-led crop but removed the speculative greenhouse transplant flag and the weak late-summer transplant carryover. Outdoor transplanting now follows the core spring Central NC row, with indoor starts only as the lead-in to those spring transplant windows.",
  "Tomatoes": "Trimmed this back to an indoor-start plus outdoor-transplant schedule and removed the greenhouse transplant flag. I also removed the late-summer transplant carryover so the outdoor `t` window stays on the core spring-to-early-summer Central NC timing instead of implying a high-confidence second planting run.",
  "Strawberries (Bare-root)": "I corrected this back toward the stronger Piedmont pattern. V2 now includes the main fall planting window in late September to early October for reliable spring-bearing establishment, while keeping spring bare-root planting only as a `*`-flagged fallback because it is more of an establishment move than the standard high-yield Piedmont timing.",
  "Potatoes (Irish)": "Left this essentially intact because the baseline already matched the NC State Central NC Irish potato row closely: plant tubers from mid-February through early April.",
  "Eggplant": "Kept eggplant transplant-led and removed the greenhouse transplant flag. I also removed the late-summer transplant carryover so the schedule reflects the core spring transplant window only, with indoor starts limited to the lead-in for that window.",
  "Calendula": "I tightened this with Clemson and Johnny's. Clemson treats pot marigold as a hardy/half-hardy annual that can be sown in fall or planted in late winter to early spring, while Johnny's frames calendula as a direct-sown annual with a short transplant lead; V2 keeps the cool-season spring/fall pattern but trims the fall sowing to the later shoulder.",
  "Cabbage": "Expanded this to the full NC State Central NC transplant row: late winter through early April, then again from mid-July into early September. Indoor starts were added only as the lead-in to those transplant windows, and the added October `tg` half-slot is only a narrow protected-culture shoulder at the outer fall edge.",
  "Broccoli": "Aligned this with the NC State Central NC broccoli transplant windows. V2 now reflects the broad spring transplant span plus the late-summer/fall transplant cycle, with indoor starts back-timed from those slots. I added only a single October `tg` shoulder beyond the outdoor fall window.",
  "Cauliflower": "Converted this to the mixed sow/transplant pattern shown on the Central NC calendar. The reviewed version carries S/T in late winter and again from August into mid-September, with indoor starts only where transplant timing implies them. The new October `tg` slot is only a protected outer-edge shoulder, not a broader greenhouse season.",
  "Yarrow": "I revised this to match the actual perennial-planting pattern better. The spring indoor-start lane stays, but Clemson's perennial guidance and the NC State toolbox both support planting or dividing yarrow in spring and fall, so V2 now includes a fall transplant window instead of pretending the crop only moves in spring.",
  "Basil": "Expanded this to match the NC State Central NC basil row: sow or transplant from May through mid-July. The indoor-start lead-in stays limited to April, and the old spring start was too early for Carrboro warmth.",
  "Kohlrabi": "Rebuilt this from the NC State Central NC kohlrabi row. V2 now uses a long spring S/T span from late winter into early summer plus a smaller August-September fall cycle.",
  "Fennel": "Shifted this to direct-sow timing from the NC State Florence fennel row and the herb-handbook guidance that fennel does not transplant well. Spring sowing now runs March-April, with a second sowing window in July-August.",
  "Cilantro": "I extended the fall cilantro window. The older row was too narrow, so V2 now carries the late-August through early-October sowing run that better matches Piedmont fall and overwinter cilantro practice, plus a small late-October `sg` shoulder for protected overwinter starts.",
  "Turnips": "Expanded this to the long direct-sow window on the NC State Central NC turnip row. V2 now shows sowing from February through mid-June and again from August into early September.",
  "Sage": "I rebuilt this around Johnny's common-sage seed guidance plus UGA's herb table. Johnny's recommends starting seed 6-8 weeks before last frost and transplanting after last frost, and UGA lists sage as a spring/fall perennial herb in the South, so V2 now uses a narrower late-spring set-out plus a small fall transplant window.",
  "Marigolds": "Kept this close to baseline after checking Clemson and Johnny's. Clemson treats marigolds as tender annuals planted after frost, and Johnny's uses a short spring seed-start lead, so the late-spring planting pattern still looks right without pretending we have a tighter Carrboro half-month source.",
  "Echinacea": "I retimed this more clearly around Johnny's. Their guidance recommends sowing 8-10 weeks before planting out and transplanting in late spring or early summer, with direct seeding only once soil is warm, so V2 moves echinacea out of the early-April transplant slot and into a later spring window.",
  "Chamomile": "Left this mostly intact as a spring indoor-start or direct-sow option. Johnny's supports a short seed-start lead and spring direct sowing, but the Carrboro/Piedmont sources are not specific enough for a more assertive half-month rewrite than this.",
  "Moonflower": "I tightened this using the NC State Plant Toolbox plus extension growing guides. NC State says to start moonflower 4-6 weeks before last spring frost after scarifying or soaking seed, and extension guidance places direct sowing after frost once soils warm, so V2 now starts it later indoors and keeps planting to May.",
  "Parsnips": "I changed parsnips materially. Instead of starting in February, V2 now treats mid-April to mid-May as the default spring sowing period and keeps the late-August to early-September window for fall overwinter intent, with `*` to flag the crop's slow, moisture-sensitive germination. I also added only a tiny October `sg` shoulder for protected overwinter sowing under the conservative greenhouse rule.",
  "Dill": "I widened spring dill back to the actual late-winter/early-spring window. V2 now starts in the second half of February, carries through early April, and keeps the late-summer sowing cycle.",
  "Borage": "Converted this to direct sow only. The herb-handbook guidance says borage should be direct-seeded because it does not transplant well, and I removed the unsupported transplant/fall cycle from the baseline.",
  "Beets": "I moved beets earlier in spring and later in fall. V2 now treats February as protected sowing only, carries spring through mid-April, and extends the fall run to early October with `*` for hot-weather establishment and overwinter intent.",
  "Ginger": "I corrected both timing and semantics here. UGA herb guidance treats ginger as a late-spring or summer crop propagated by root division, and their home-growing guide starts rhizome preparation in early spring before planting once warmth arrives, so V2 now uses `*` for spring rhizome handling and shifts set-out to late spring into early summer.",
  "Cabbage (Chinese)": "Aligned this to the NC State Central NC Chinese cabbage row. The reviewed version drops the speculative greenhouse slot and uses a small spring S/T window, August sowing, and transplanting again in late September to early October; the remaining `tg` slot is only the protected-culture shoulder at the outer fall edge, with a short `si` lead-in ahead of both transplant cycles.",
  "Sunflower": "Rebuilt this around the NC State Central NC sunflower row, then checked it against Johnny's. Johnny's supports direct sowing after frost with successions, but V2 stays conservative and starts the sowing window in April, after the last frost, for reliable germination in the NC Piedmont.",
  "Squash (Summer)": "Expanded this to the full NC State Central NC summer-squash row: sow or transplant from early April through early August. A small April indoor-start lead-in remains only to support the earliest transplant slot.",
  "Cucumbers": "Aligned this with the NC State Central NC cucumber row. V2 now uses a broad April-to-early-August S/T window and keeps indoor starts limited to the lead-in for transplanting.",
  "Zinnias": "I expanded this using Johnny's plus Clemson annual guidance. Clemson classifies zinnia as a tender annual planted only after frost, while Johnny's recommends sowing transplants 4 weeks ahead and succession-sowing every 2 weeks, so V2 now starts the indoor lead slightly earlier and carries direct sowing further into summer.",
  "Nasturtium": "I tightened this with Clemson and Johnny's. Clemson explicitly lists nasturtium as a hardy or half-hardy annual to seed in early spring, while Johnny's still recommends direct seeding as the main method with only a short transplant lead, so V2 shifts the planting window earlier and keeps direct sowing as the dominant pattern.",
  "Corn (Sweet)": "Rebuilt this from the NC State Central NC sweet-corn row. The reviewed version starts much earlier than the baseline, with direct sowing from mid-March through mid-May.",
  "Cantaloupe": "Aligned this with the NC State Central NC cantaloupe row, then widened the tail slightly after review. V2 now carries sowing or transplanting into early July and keeps harvest into the first half of October, which fits Piedmont melon season better than the earlier cutoff.",
  "Squash (Winter)": "Expanded this to the NC State Central NC winter-squash row: sow or transplant from mid-April through early August. The baseline was too narrow and too front-loaded.",
  "Potatoes (Sweet)": "Adjusted this to the full NC State Central NC sweet-potato transplant window, starting in early May instead of mid-May.",
  "Peas (Field)": "I tightened this with Southeastern extension sources. Clemson treats southern peas or field peas as a warm-season Piedmont crop planted from about April 15 through July 15, while NC State notes cowpeas can be planted after frost through late summer; V2 follows the more conservative Piedmont home-garden window rather than implying a longer run.",
  "Lima Bean (Pole)": "Rebuilt this from the NC State Central NC lima-pole row. V2 now shows the main sowing run from mid-April into June, with a small later July slot retained from the source.",
  "Watermelon": "Aligned this with the NC State Central NC watermelon row, then extended the tail after review. V2 now carries sowing or transplanting through early July and keeps harvest into the first half of October, which better matches Piedmont melon production.",
  "Okra": "Reset this around the NC State and Piedmont guidance rather than the earlier narrower row. V2 now carries sowing or transplanting through early June, starts harvest in late July instead of early July, keeps the August sowing overlap, and extends harvest into early November.",
  "Lima Bean (Bush)": "Expanded this to the full NC State Central NC lima-bush row, with sowing from mid-April through mid-July.",
  "Pumpkin": "Aligned this with the NC State Central NC pumpkin row. V2 now uses direct sowing from mid-April through mid-June and removes the unsupported transplant emphasis.",
  "Brussels Sprouts": "Shifted this earlier to match the NC State Central NC Brussels sprout transplant window from July through mid-August, but delayed the reliable harvest start after review. V2 now treats November as the real beginning of the harvest window instead of implying dependable late-October sprouts.",
  "Rutabaga": "Rebuilt this from the NC State Central NC rutabaga row. The reviewed version is much broader than the baseline, with sowing in late winter/early spring and again from July through mid-September.",
  "Garlic": "I extended garlic one more half-month. V2 already treated it as a bulb/clove planting crop, and it now carries into the first half of December to match the broader Piedmont garlic window.",
  "Beans, Snap (Bush)": "Added this as the missing warm-season snap bean row rather than treating lima beans as a substitute. The timing is conservative and direct-sow-led: spring through late-summer sowing, with harvest trailing behind each succession.",
  "Beans, Snap (Pole)": "Added pole snap beans separately from bush snap beans and separately from limas. The row keeps the same warm-soil sowing logic as bush beans but stretches harvest slightly longer because pole types start later and bear over a longer period.",
  "Asparagus": "This is a perennial-bed crop, so I kept the row intentionally simple: spring crown planting and the main established-bed harvest window. The annual calendar model does not capture fern management or the multi-year establishment period cleanly, so V2 stays conservative here.",
  "Blueberries": "Added as a perennial fruit row focused on planting windows and the main early-summer harvest season. The highest-risk variable here is not calendar timing but soil acidity, so the guide note carries more weight than the half-month row.",
  "Blackberries": "Added as a perennial fruit row with conservative spring and fall planting windows plus the normal early-summer harvest window. The row is intentionally lighter than an annual vegetable because cane management matters as much as planting date.",
  "Rosemary": "Added as a perennial herb transplant row with conservative spring and early-fall set-out timing and broad warm-season clipping harvest. The main caution in Piedmont conditions is drainage rather than exact week-by-week timing.",
  "Thyme": "Added as a conservative perennial herb row. Like rosemary, the important Piedmont constraint is drainage and crown health, so the schedule emphasizes safe transplant windows and treats harvest as a broad clipping season.",
  "Oregano": "Added as a perennial herb with simple spring and early-fall planting windows plus a long warm-season cutting window. The calendar is intentionally broad because oregano is forgiving once established.",
  "Mint": "Added as a perennial herb row with spring and early-fall planting plus repeated warm-season harvest. I kept the timing broad and left the stronger warning in the guide note: containment matters more than exact planting week."
};

const PLANT_REVIEW_CONFIDENCE_RUBRIC = {
  5: "Direct NC or Piedmont timing support, second regional agreement, and minimal inference.",
  4: "Strong direct timing support with only minor inferred edges such as harvest tails or protected-culture shoulders.",
  3: "Good regional support with usable local fit, but one meaningful piece is still inferred or generalized.",
  2: "Useful planning row with substantial inference, weaker local precision, or crop-class ambiguity.",
  1: "Low-confidence row driven mainly by vendor, perennial, or nonlocal guidance.",
  0: "Placeholder-grade confidence; keep conservative until stronger local evidence is added."
};

const PLANT_REVIEW_CONFIDENCE_SCORES = {
  "Arugula": 5,
  "Lettuce, Head": 5,
  "Radishes": 5,
  "Lettuce, Leaf": 5,
  "Onions, Green": 4,
  "Spinach": 5,
  "Celery": 4,
  "Onions, Bulb": 4,
  "Leek": 4,
  "Kale": 5,
  "Collard Greens": 5,
  "Bok Choy": 4,
  "Snapdragons": 4,
  "Lavender": 4,
  "Stock": 4,
  "Chives": 4,
  "Snap Pea (Bush)": 5,
  "Snap Pea (Pole)": 5,
  "Peas, Vining": 5,
  "Peas, Bush": 5,
  "Mustard": 5,
  "Parsley": 4,
  "Chard, Swiss": 4,
  "Carrots": 5,
  "Peppers": 5,
  "Tomatoes": 5,
  "Strawberries (Bare-root)": 4,
  "Potatoes (Irish)": 5,
  "Eggplant": 5,
  "Calendula": 4,
  "Cabbage": 5,
  "Broccoli": 5,
  "Cauliflower": 5,
  "Yarrow": 4,
  "Basil": 5,
  "Kohlrabi": 5,
  "Fennel": 4,
  "Cilantro": 5,
  "Turnips": 5,
  "Sage": 4,
  "Marigolds": 4,
  "Echinacea": 2,
  "Chamomile": 2,
  "Moonflower": 4,
  "Parsnips": 4,
  "Dill": 5,
  "Borage": 2,
  "Beets": 5,
  "Ginger": 4,
  "Cabbage (Chinese)": 5,
  "Sunflower": 4,
  "Squash (Summer)": 5,
  "Cucumbers": 5,
  "Zinnias": 4,
  "Nasturtium": 4,
  "Corn (Sweet)": 5,
  "Cantaloupe": 5,
  "Squash (Winter)": 5,
  "Potatoes (Sweet)": 5,
  "Peas (Field)": 4,
  "Lima Bean (Pole)": 4,
  "Watermelon": 5,
  "Okra": 5,
  "Lima Bean (Bush)": 4,
  "Pumpkin": 5,
  "Brussels Sprouts": 5,
  "Rutabaga": 5,
  "Garlic": 5,
  "Beans, Snap (Bush)": 5,
  "Beans, Snap (Pole)": 5,
  "Asparagus": 4,
  "Blueberries": 4,
  "Blackberries": 4,
  "Rosemary": 4,
  "Thyme": 4,
  "Oregano": 4,
  "Mint": 4
};

const REVIEW_SOURCE_LIBRARY = {
  nc_state_calendar: {
    label: "NC State Calendar",
    url: "https://content.ces.ncsu.edu/central-north-carolina-planting-calendar-for-annual-vegetables-fruits-and-herbs"
  },
  nc_state_veg_handbook: {
    label: "NC State Veg Handbook",
    url: "https://content.ces.ncsu.edu/extension-gardener-handbook/16-vegetable-gardening"
  },
  nc_state_ornamentals: {
    label: "NC State Ornamentals",
    url: "https://content.ces.ncsu.edu/extension-gardener-handbook/10-herbaceous-ornamentals"
  },
  piedmont_guide: {
    label: "Piedmont Guide",
    url: "https://growingsmallfarms.ces.ncsu.edu/growingsmallfarms-plantingguide/"
  },
  uga_herb: {
    label: "UGA Herb",
    url: "https://extension.uga.edu/publications/detail.html?number=B1170"
  },
  clemson_annual: {
    label: "Clemson Annual",
    url: "https://hgic.clemson.edu/factsheet/growing-annuals/"
  },
  clemson_southern_peas: {
    label: "Clemson Southern Peas",
    url: "https://hgic.clemson.edu/factsheet/southern-peas/"
  },
  clemson_echinacea: {
    label: "Clemson Echinacea",
    url: "https://hgic.clemson.edu/factsheet/echinacea/"
  },
  clemson_moonflower: {
    label: "Clemson Moonflower",
    url: "https://hgic.clemson.edu/factsheet/vine-selections-for-landscaping/"
  },
  uga_ginger: {
    label: "UGA Ginger",
    url: "https://site.extension.uga.edu/fultonag/2021/03/growing-ginger-and-turmeric-at-home/"
  },
  nc_state_small_fruits: {
    label: "NC State Small Fruits",
    url: "https://content.ces.ncsu.edu/extension-gardener-handbook/14-small-fruits"
  },
  nc_state_strawberries: {
    label: "NC State Strawberries",
    url: "https://content.ces.ncsu.edu/growing-strawberries-in-childcare-center-gardens"
  },
  nc_state_strawberry_toolbox: {
    label: "NC State Strawberry",
    url: "https://plants.ces.ncsu.edu/plants/fragaria-x-ananassa/"
  },
  nc_state_asparagus: {
    label: "NC State Asparagus",
    url: "https://content.ces.ncsu.edu/home-garden-asparagus-production"
  },
  nc_state_blueberries: {
    label: "NC State Blueberries",
    url: "https://content.ces.ncsu.edu/growing-blueberries-in-the-home-garden"
  },
  nc_state_blueberry_toolbox: {
    label: "NC State Blueberry",
    url: "https://plants.ces.ncsu.edu/plants/vaccinium/common-name/blueberries/"
  },
  nc_state_blackberries: {
    label: "NC State Blackberries",
    url: "https://content.ces.ncsu.edu/blackberries-for-the-home-garden"
  },
  nc_state_blackberry_toolbox: {
    label: "NC State Blackberry",
    url: "https://plants.ces.ncsu.edu/plants/rubus/"
  },
  nc_state_lavender: {
    label: "NC State Lavender",
    url: "https://plants.ces.ncsu.edu/plants/lavandula-angustifolia/common-name/lavender/"
  },
  nc_state_chives: {
    label: "NC State Chives",
    url: "https://plants.ces.ncsu.edu/plants/allium-schoenoprasum/"
  },
  nc_state_parsley: {
    label: "NC State Parsley",
    url: "https://plants.ces.ncsu.edu/plants/petroselinum-crispum/common-name/parsley/"
  },
  nc_state_fennel: {
    label: "NC State Fennel",
    url: "https://plants.ces.ncsu.edu/plants/foeniculum-vulgare/common-name/fennel/"
  },
  nc_state_cilantro: {
    label: "NC State Cilantro",
    url: "https://plants.ces.ncsu.edu/plants/coriandrum-sativum/common-name/cilantro/"
  },
  nc_state_dill: {
    label: "NC State Dill",
    url: "https://plants.ces.ncsu.edu/plants/anethum-graveolens/common-name/dill/"
  },
  nc_state_rosemary: {
    label: "NC State Rosemary",
    url: "https://plants.ces.ncsu.edu/plants/salvia-rosmarinus/common-name/rosemary/"
  },
  nc_state_thyme: {
    label: "NC State Thyme",
    url: "https://plants.ces.ncsu.edu/plants/thymus-vulgaris/common-name/common-thyme/"
  },
  nc_state_oregano: {
    label: "NC State Oregano",
    url: "https://plants.ces.ncsu.edu/plants/origanum-vulgare/common-name/oregano/"
  },
  nc_state_mint: {
    label: "NC State Mint",
    url: "https://plants.ces.ncsu.edu/plants/mentha-spicata/common-name/mint/"
  },
  nc_state_sage: {
    label: "NC State Sage",
    url: "https://plants.ces.ncsu.edu/plants/salvia-officinalis/common-name/sage/"
  },
  nc_state_snapdragon: {
    label: "NC State Snapdragon",
    url: "https://plants.ces.ncsu.edu/plants/antirrhinum-majus/common-name/snapdragon/"
  },
  nc_state_stock: {
    label: "NC State Stock",
    url: "https://plants.ces.ncsu.edu/plants/matthiola-incana/common-name/stock/"
  },
  nc_state_yarrow: {
    label: "NC State Yarrow",
    url: "https://plants.ces.ncsu.edu/plants/achillea-millefolium/"
  },
  nc_state_moonflower: {
    label: "NC State Moonflower",
    url: "https://plants.ces.ncsu.edu/plants/ipomoea-alba/common-name/moonflower/"
  },
  nc_state_echinacea: {
    label: "NC State Echinacea",
    url: "https://plants.ces.ncsu.edu/plants/echinacea-purpurea/common-name/purple-coneflower/"
  },
  nc_state_chamomile: {
    label: "NC State Chamomile",
    url: "https://plants.ces.ncsu.edu/plants/matricaria-chamomilla/common-name/chamomile/"
  },
  nc_state_borage: {
    label: "NC State Borage",
    url: "https://plants.ces.ncsu.edu/plants/borago-officinalis/common-name/starflower/"
  },
  nc_state_calendula: {
    label: "NC State Calendula",
    url: "https://plants.ces.ncsu.edu/plants/calendula-officinalis/common-name/calendula/"
  },
  nc_state_sunflower: {
    label: "NC State Sunflower",
    url: "https://plants.ces.ncsu.edu/plants/helianthus-annuus/common-name/sunflower/"
  },
  nc_state_zinnia: {
    label: "NC State Zinnia",
    url: "https://plants.ces.ncsu.edu/plants/zinnia-elegans/"
  },
  nc_state_nasturtium: {
    label: "NC State Nasturtium",
    url: "https://plants.ces.ncsu.edu/plants/tropaeolum-majus/common-name/nasturtium/"
  },
  nc_state_marigold: {
    label: "NC State Marigold",
    url: "https://plants.ces.ncsu.edu/plants/tagetes/common-name/marigold/"
  }
};

const CALENDAR_EVIDENCE_PLANTS = new Set([
  "Arugula",
  "Lettuce, Head",
  "Radishes",
  "Lettuce, Leaf",
  "Onions, Green",
  "Spinach",
  "Celery",
  "Onions, Bulb",
  "Leek",
  "Kale",
  "Collard Greens",
  "Bok Choy",
  "Snap Pea (Bush)",
  "Snap Pea (Pole)",
  "Peas, Vining",
  "Peas, Bush",
  "Mustard",
  "Parsley",
  "Chard, Swiss",
  "Carrots",
  "Peppers",
  "Tomatoes",
  "Potatoes (Irish)",
  "Eggplant",
  "Cabbage",
  "Broccoli",
  "Cauliflower",
  "Basil",
  "Kohlrabi",
  "Fennel",
  "Cilantro",
  "Turnips",
  "Parsnips",
  "Dill",
  "Beets",
  "Cabbage (Chinese)",
  "Squash (Summer)",
  "Cucumbers",
  "Corn (Sweet)",
  "Cantaloupe",
  "Squash (Winter)",
  "Potatoes (Sweet)",
  "Lima Bean (Pole)",
  "Watermelon",
  "Okra",
  "Lima Bean (Bush)",
  "Pumpkin",
  "Brussels Sprouts",
  "Rutabaga",
  "Garlic",
  "Beans, Snap (Bush)",
  "Beans, Snap (Pole)",
  "Asparagus",
  "Peas (Field)"
]);

const UGA_HERB_EVIDENCE_PLANTS = new Set([
  "Lavender",
  "Chives",
  "Parsley",
  "Fennel",
  "Cilantro",
  "Dill",
  "Sage",
  "Yarrow",
  "Ginger",
  "Rosemary",
  "Thyme",
  "Oregano",
  "Mint"
]);

const CLEMSON_ANNUAL_EVIDENCE_PLANTS = new Set([
  "Snapdragons",
  "Stock",
  "Calendula",
  "Marigolds",
  "Chamomile",
  "Borage",
  "Sunflower",
  "Zinnias",
  "Nasturtium",
  "Moonflower"
]);

const ORNAMENTAL_EVIDENCE_PLANTS = new Set([
  "Snapdragons",
  "Lavender",
  "Stock",
  "Yarrow",
  "Calendula",
  "Marigolds",
  "Echinacea",
  "Chamomile",
  "Moonflower",
  "Borage",
  "Sunflower",
  "Zinnias",
  "Nasturtium"
]);

const SPECIAL_REVIEW_EVIDENCE_SOURCES = {
  "Snapdragons": ["nc_state_snapdragon"],
  "Lavender": ["nc_state_lavender"],
  "Stock": ["nc_state_stock"],
  "Chives": ["nc_state_chives"],
  "Parsley": ["nc_state_parsley"],
  "Fennel": ["nc_state_fennel"],
  "Cilantro": ["nc_state_cilantro"],
  "Dill": ["nc_state_dill"],
  "Yarrow": ["nc_state_yarrow"],
  "Sage": ["nc_state_sage"],
  "Moonflower": ["nc_state_moonflower", "clemson_moonflower"],
  "Echinacea": ["nc_state_echinacea", "clemson_echinacea"],
  "Chamomile": ["nc_state_chamomile"],
  "Borage": ["nc_state_borage"],
  "Calendula": ["nc_state_calendula"],
  "Sunflower": ["nc_state_sunflower"],
  "Zinnias": ["nc_state_zinnia"],
  "Nasturtium": ["nc_state_nasturtium"],
  "Marigolds": ["nc_state_marigold"],
  "Peas (Field)": ["clemson_southern_peas"],
  "Ginger": ["uga_ginger"],
  "Asparagus": ["nc_state_asparagus"],
  "Strawberries (Bare-root)": ["nc_state_small_fruits", "nc_state_strawberries", "nc_state_strawberry_toolbox"],
  "Blueberries": ["nc_state_small_fruits", "nc_state_blueberries", "nc_state_blueberry_toolbox"],
  "Blackberries": ["nc_state_small_fruits", "nc_state_blackberries", "nc_state_blackberry_toolbox"],
  "Rosemary": ["nc_state_rosemary"],
  "Thyme": ["nc_state_thyme"],
  "Oregano": ["nc_state_oregano"],
  "Mint": ["nc_state_mint"]
};

const PLANT_GREENHOUSE_CONFIDENCE = {
  "Spinach": {
    level: "high",
    note: "Protected sowing is supported only on the overwinter shoulder, not as a broad winter lane."
  },
  "Lettuce, Head": {
    level: "high",
    note: "Protected sowing is limited to a late-February spring shoulder and a single October season-extension shoulder."
  },
  "Lettuce, Leaf": {
    level: "high",
    note: "Protected baby-leaf sowing is limited to a late-February spring shoulder and a narrow October shoulder."
  },
  "Onions, Bulb": {
    level: "high",
    note: "The early-February greenhouse code reflects a protection-dependent transplant edge already described in the review."
  },
  "Kale": {
    level: "high",
    note: "Protected culture remains only an early-winter shoulder after the outdoor fall window."
  },
  "Collard Greens": {
    level: "high",
    note: "Protected culture remains a narrow late-fall to early-winter greens shoulder."
  },
  "Bok Choy": {
    level: "high",
    note: "The greenhouse lane is limited to the outer fall transplant edge and does not replace the main outdoor window."
  },
  "Parsley": {
    level: "medium",
    note: "Protected sowing is a modest herb shoulder that now stretches into late November, not a fully sourced winter production row."
  },
  "Cabbage": {
    level: "medium",
    note: "The greenhouse code is limited to a single October transplant shoulder beyond the outdoor fall window."
  },
  "Broccoli": {
    level: "medium",
    note: "The greenhouse code is limited to a single October transplant shoulder beyond the outdoor fall window."
  },
  "Cauliflower": {
    level: "medium",
    note: "The greenhouse code is limited to a single October transplant shoulder beyond the outdoor fall window."
  },
  "Cilantro": {
    level: "high",
    note: "Protected sowing is limited to a small late-October overwinter shoulder."
  },
  "Chard, Swiss": {
    level: "high",
    note: "Protected chard is kept as a small fall-to-early-winter shoulder only."
  },
  "Carrots": {
    level: "medium",
    note: "Late-October greenhouse sowing is treated strictly as an overwinter edge."
  },
  "Parsnips": {
    level: "medium",
    note: "Protected sowing is limited to a single October overwinter shoulder."
  },
  "Beets": {
    level: "high",
    note: "Protected sowing is limited to the cold spring and late-fall shoulders already described in the review."
  },
  "Cabbage (Chinese)": {
    level: "high",
    note: "Protected culture is limited to the outer fall transplant shoulder."
  }
};

const GREENHOUSE_RULES = {
  mode: "conservative",
  definition: "Use `sg`/`tg` only for unheated greenhouse, cold frame, or similar passive protection.",
  preseasonShift: {
    defaultCoolSeasonWeeksEarlier: "2-4",
    interpretation: "Treat passive cover as a modest preseason shift for cool-season crops, not as a whole separate season.",
    requireExtraSupportBeyond: "4 weeks"
  },
  principles: [
    "No crop gets greenhouse timing by default.",
    "Assume unheated greenhouse timing is usually only about 2-4 weeks earlier than the comparable outdoor lane for cool-season crops.",
    "Use `sg` mainly for cool-season direct-sow shoulders or overwinter starts already supported by V2 notes.",
    "Use `tg` mainly for cool-season transplant shoulders at the outer fall or late-winter edge.",
    "Prefer `si` over `sg` for warm-season tender crops that need heat, not just protection.",
    "If a proposed greenhouse slot extends more than about 4 weeks beyond the outdoor lane, require crop-specific support before adding it.",
    "If a V2 review note says greenhouse timing was speculative or removed, do not restore it from the rule alone."
  ],
  categories: {
    allow_sg_shoulder: {
      label: "Allow SG Shoulder",
      description: "Crop can carry a small protected-culture sowing shoulder, usually within a 2-4 week shift, when the note supports season extension or overwinter intent."
    },
    allow_tg_shoulder: {
      label: "Allow TG Shoulder",
      description: "Crop can carry a small protected-culture transplant shoulder, usually within a 2-4 week shift, at the outer edge of the reviewed window."
    },
    prefer_si_not_greenhouse: {
      label: "Prefer SI, Not SG/TG",
      description: "Tender crop should generally be started indoors for later planting rather than treated as a passive-greenhouse crop."
    },
    blocked_after_review: {
      label: "Blocked After Review",
      description: "V2 notes explicitly removed or rejected speculative greenhouse timing; do not re-add without stronger evidence."
    }
  }
};

const PLANT_GREENHOUSE_RULE_CATEGORY = {
  "Spinach": "allow_sg_shoulder",
  "Lettuce, Head": "allow_sg_shoulder",
  "Lettuce, Leaf": "allow_sg_shoulder",
  "Kale": "allow_sg_shoulder",
  "Collard Greens": "allow_sg_shoulder",
  "Parsley": "allow_sg_shoulder",
  "Chard, Swiss": "allow_sg_shoulder",
  "Carrots": "allow_sg_shoulder",
  "Parsnips": "allow_sg_shoulder",
  "Beets": "allow_sg_shoulder",
  "Cilantro": "allow_sg_shoulder",
  "Onions, Bulb": "allow_tg_shoulder",
  "Bok Choy": "allow_tg_shoulder",
  "Cabbage": "allow_tg_shoulder",
  "Broccoli": "allow_tg_shoulder",
  "Cauliflower": "allow_tg_shoulder",
  "Cabbage (Chinese)": "allow_tg_shoulder",
  "Tomatoes": "prefer_si_not_greenhouse",
  "Peppers": "prefer_si_not_greenhouse",
  "Eggplant": "prefer_si_not_greenhouse",
  "Arugula": "blocked_after_review",
  "Mustard": "blocked_after_review",
  "Snap Pea (Bush)": "blocked_after_review",
  "Snap Pea (Pole)": "blocked_after_review",
  "Peas, Vining": "blocked_after_review",
  "Peas, Bush": "blocked_after_review"
};

// Helper function to get plant guide data
function getPlantGuide(plantName) {
  return PLANT_GUIDE[plantName] || null;
}

// Check if a plant has guide data available
function hasGuideData(plantName) {
  return PLANT_GUIDE.hasOwnProperty(plantName);
}

function getPlantReviewNote(plantName) {
  return PLANT_REVIEW_NOTES[plantName] || null;
}

function getPlantReviewConfidenceScore(plantName) {
  return Object.prototype.hasOwnProperty.call(PLANT_REVIEW_CONFIDENCE_SCORES, plantName)
    ? PLANT_REVIEW_CONFIDENCE_SCORES[plantName]
    : null;
}

function getPlantReviewConfidence(plantName) {
  const score = getPlantReviewConfidenceScore(plantName);
  if (score === null) return null;
  if (score >= 4) return "high";
  if (score >= 2) return "medium";
  return "low";
}

function getPlantReviewEvidenceSources(plantName) {
  const sourceIds = [];

  if (CALENDAR_EVIDENCE_PLANTS.has(plantName)) {
    sourceIds.push("nc_state_calendar", "piedmont_guide", "nc_state_veg_handbook");
  }

  if (UGA_HERB_EVIDENCE_PLANTS.has(plantName)) {
    sourceIds.push("uga_herb", "nc_state_veg_handbook");
  }

  if (CLEMSON_ANNUAL_EVIDENCE_PLANTS.has(plantName)) {
    sourceIds.push("clemson_annual");
  }

  if (ORNAMENTAL_EVIDENCE_PLANTS.has(plantName)) {
    sourceIds.push("nc_state_ornamentals");
  }

  if (SPECIAL_REVIEW_EVIDENCE_SOURCES[plantName]) {
    sourceIds.push(...SPECIAL_REVIEW_EVIDENCE_SOURCES[plantName]);
  }

  return [...new Set(sourceIds)]
    .map(sourceId => {
      const source = REVIEW_SOURCE_LIBRARY[sourceId];
      if (!source) return null;

      return {
        id: sourceId,
        ...source
      };
    })
    .filter(Boolean);
}

function getPlantGreenhouseConfidence(plantName) {
  return PLANT_GREENHOUSE_CONFIDENCE[plantName]?.level || null;
}

function getPlantGreenhouseNote(plantName) {
  return PLANT_GREENHOUSE_CONFIDENCE[plantName]?.note || null;
}

function getGreenhouseRules() {
  return GREENHOUSE_RULES;
}

function getPlantGreenhouseRuleCategory(plantName) {
  return PLANT_GREENHOUSE_RULE_CATEGORY[plantName] || null;
}

function getPlantGreenhouseRule(plantName) {
  const category = getPlantGreenhouseRuleCategory(plantName);
  if (!category) return null;

  return {
    category,
    ...GREENHOUSE_RULES.categories[category]
  };
}
