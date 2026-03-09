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
// - `o`  = other / special handling
//
// Derivation notes:
// - This file is the baseline dataset used by the app as `V1`.
// - It reflects the original planner timings and local growing assumptions that existed before
//   the Carrboro-specific source audit.
// - It is useful as the comparison track, but it was not normalized crop-by-crop against a
//   single Piedmont source stack in the way `data.carrboro-review.js` was.

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
  o: "Other",
  B: "Outdoors (Bulbs / Sets)"
};

const TASKS = {
  jan: {
    half1: "Order seeds; clean and sharpen tools; prune dormant fruit trees and grapes; inspect stored pantry crops; check grow lights; purge vent greenhouse on warm days; scout for winter pests (aphids, whiteflies); secondary frost protection for temps below 25°F",
    half2: "Send soil test to NC State; inventory potting mix/trays; plan bed layout; organize seed storage; take hardwood cuttings (figs, grapes, blueberries); purge vent greenhouse on warm days; scout for winter pests (aphids, whiteflies); secondary frost protection for temps below 25°F"
  },
  feb: {
    half1: "Finish fruit tree pruning; spread compost (no till); check irrigation lines; check hardwood cuttings for callus/roots; purge vent greenhouse on warm days; scout for winter pests (aphids, whiteflies); leach greenhouse soil for salt buildup if needed",
    half2: "Prune roses and woody herbs; clean greenhouse glazing; scrub seedling trays; top-dress berries with compost; purge vent greenhouse on warm days; scout for winter pests (aphids, whiteflies); leach greenhouse soil for salt buildup if needed"
  },
  mar: {
    half1: "Harden off cool-weather seedlings; weed early; set up trellises; check raised beds for rot; start sweet potato slips from tubers; leach greenhouse soil for salt buildup if needed",
    half2: "Check irrigation pressure; set up heavy-duty tomato cages; side-dress overwintered crops; clean rain barrels"
  },
  apr: {
    half1: "Watch for \"False Spring\" (covers ready); harden off warm-season seedlings; weed; thin root crops; divide clumping herbs (chives/mint); wait for 60°F soil at 4\" before transplanting tomatoes",
    half2: "Scout for aphids on brassicas; side-dress heavy feeders; protect strawberry blooms; install insect netting; wait for 60°F soil at 4\" before transplanting tomatoes"
  },
  may: {
    half1: "Mulch heavily; scout for potato beetles; hill up potatoes; install drip tape; take softwood cuttings of tender herbs (lemon verbena, stevia)",
    half2: "Deep water (1 inch/week); trellis tomatoes; scout for vine borers; weed; take softwood cuttings of woody herbs (sage, thyme, oregano)"
  },
  jun: {
    half1: "Harvest garlic scapes; Stop watering onions/garlic; deadhead flowers; root tomato suckers in water (for late-season backup plants)",
    half2: "Harvest Garlic & Onions (cure in shade); summer prune water sprouts; shade cloth on greenhouse when temps reach 85°F; harvest herbs for drying"
  },
  jul: {
    half1: "Prune blackberry/raspberry canes; pull bolted lettuce; deep water fruit trees; turn compost pile; take cuttings of annual flowers (coleus, zinnias)",
    half2: "Solarize empty beds; remove spent squash plants; harvest first summer fruits; monitor for hornworms"
  },
  aug: {
    half1: "Amend soil for Fall; prune basil/perilla hard; maintenance prune tomatoes; take semi-hardwood cuttings (rosemary, lavender) for next year",
    half2: "Renovate strawberry beds (thin runners); preserve harvest; check row covers; water seedlings daily; pot up rooted herb cuttings"
  },
  sep: {
    half1: "Seed-save heirloom varieties; watch for cabbage worms; maintain moisture for fall roots; take cuttings of tender perennials to overwinter indoors",
    half2: "Prep cold frames; harvest sweet potatoes (cure); bring tender potted herbs indoors; remove shade cloth"
  },
  oct: {
    half1: "Harvest pumpkins/winter squash; mulch perennials; harvest ginger/turmeric roots; roast/freeze peppers; collect seeds",
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
      mar: { half1: ["s"], half2: ["s"] },
      apr: { half1: [], half2: [] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: ["s"], half2: ["s"] },
      sep: { half1: ["s"], half2: ["s"] },
      oct: { half1: ["sg"], half2: ["sg"] },
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
      feb: { half1: ["s", "si"], half2: ["s", "si"] },
      mar: { half1: ["s"], half2: ["t"] },
      apr: { half1: ["t"], half2: ["t"] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: ["si"], half2: ["s", "si"] },
      sep: { half1: ["s"], half2: ["t"] },
      oct: { half1: ["t", "sg"], half2: ["sg"] },
      nov: { half1: [], half2: [] },
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
      feb: { half1: ["s"], half2: ["s"] },
      mar: { half1: ["s"], half2: ["s"] },
      apr: { half1: ["s"], half2: ["s"] },
      may: { half1: ["s"], half2: ["s"] },
      jun: { half1: ["s"], half2: ["s"] },
      jul: { half1: [], half2: [] },
      aug: { half1: ["s"], half2: ["s"] },
      sep: { half1: ["s"], half2: [] },
      oct: { half1: ["sg"], half2: ["sg"] },
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
      feb: { half1: ["s", "t", "si"], half2: ["s", "t", "si"] },
      mar: { half1: ["s", "t"], half2: ["s", "t"] },
      apr: { half1: ["s", "t"], half2: ["s", "t"] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: ["si"] },
      jul: { half1: ["si"], half2: ["si"] },
      aug: { half1: ["s", "t", "si"], half2: ["s", "t"] },
      sep: { half1: ["s", "t"], half2: ["s", "t"] },
      oct: { half1: ["sg"], half2: ["sg"] },
      nov: { half1: [], half2: [] },
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
      jan: { half1: ["sg", "si"], half2: ["sg", "si"] },
      feb: { half1: ["s", "sg"], half2: ["s", "sg"] },
      mar: { half1: ["s"], half2: ["s"] },
      apr: { half1: [], half2: [] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: ["si"] },
      jul: { half1: ["si"], half2: ["si"] },
      aug: { half1: [], half2: ["t"] },
      sep: { half1: ["s", "t"], half2: [] },
      oct: { half1: ["sg"], half2: ["sg"] },
      nov: { half1: [], half2: [] },
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
      feb: { half1: [], half2: ["s"] },
      mar: { half1: ["s"], half2: ["s"] },
      apr: { half1: ["s"], half2: ["s"] },
      may: { half1: ["s"], half2: ["s"] },
      jun: { half1: ["s"], half2: ["s"] },
      jul: { half1: [], half2: [] },
      aug: { half1: ["s"], half2: ["s"] },
      sep: { half1: ["s"], half2: ["s"] },
      oct: { half1: ["s", "sg"], half2: ["sg"] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
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
      mar: { half1: ["t"], half2: ["t", "si"] },
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
      jan: { half1: ["s", "sg"], half2: ["s", "sg"] },
      feb: { half1: ["s", "sg"], half2: ["s", "sg"] },
      mar: { half1: ["s", "B"], half2: ["s", "B"] },
      apr: { half1: [], half2: [] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: ["s"], half2: ["s"] },
      sep: { half1: ["s"], half2: ["s"] },
      oct: { half1: ["s"], half2: ["s"] },
      nov: { half1: ["s"], half2: ["s"] },
      dec: { half1: ["s"], half2: ["s"] }
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
      feb: { half1: ["si"], half2: ["s", "t", "si"] },
      mar: { half1: ["s", "t", "si"], half2: ["s", "t", "si"] },
      apr: { half1: ["s", "t"], half2: ["s", "t"] },
      may: { half1: ["s", "t"], half2: ["s", "t"] },
      jun: { half1: ["s", "t"], half2: ["s", "t"] },
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
      jan: { half1: ["sg", "si"], half2: ["sg", "si"] },
      feb: { half1: ["sg", "si"], half2: ["sg", "s", "t"] },
      mar: { half1: ["s", "t"], half2: ["s", "t"] },
      apr: { half1: ["s", "t"], half2: ["s", "t"] },
      may: { half1: ["s", "t"], half2: ["s", "t"] },
      jun: { half1: ["s", "t"], half2: ["s", "t"] },
      jul: { half1: ["si"], half2: ["si"] },
      aug: { half1: ["s", "t", "si"], half2: ["s", "t"] },
      sep: { half1: ["s", "t"], half2: ["s", "t"] },
      oct: { half1: ["sg"], half2: ["sg"] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 11,
    name: "Collard Greens",
    type: "vegetable",
    spacing: "18",
    daysToHarvest: "T = 32-72, S = 60-100",
    months: {
      jan: { half1: [], half2: ["sg", "si"] },
      feb: { half1: ["sg", "si"], half2: ["si", "sg"] },
      mar: { half1: ["si"], half2: ["s", "t"] },
      apr: { half1: ["s", "t"], half2: [] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: ["si"], half2: ["si"] },
      sep: { half1: ["s", "t"], half2: ["s", "t"] },
      oct: { half1: ["t"], half2: ["tg"] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 12,
    name: "Bok Choy",
    type: "vegetable",
    spacing: "7-12",
    daysToHarvest: "T = 30-75, S = 45-90**",
    months: {
      jan: { half1: [], half2: ["sg", "si"] },
      feb: { half1: ["sg", "si"], half2: [] },
      mar: { half1: [], half2: ["si"] },
      apr: { half1: ["s", "t"], half2: ["s", "t"] },
      may: { half1: ["t"], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: ["si"], half2: ["si"] },
      sep: { half1: ["s", "t"], half2: ["s", "t"] },
      oct: { half1: ["tg"], half2: [] },
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
      mar: { half1: ["si", "t"], half2: ["t"] },
      apr: { half1: ["t", "s"], half2: ["s"] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: ["s"] },
      sep: { half1: ["s"], half2: ["s"] },
      oct: { half1: [], half2: [] },
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
      jan: { half1: [], half2: ["si"] },
      feb: { half1: ["si"], half2: ["si"] },
      mar: { half1: ["si"], half2: ["t"] },
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
    id: 15,
    name: "Stock",
    type: "flower",
    spacing: "8-12",
    daysToHarvest: "S = 60-80",
    months: {
      jan: { half1: [], half2: ["si"] },
      feb: { half1: ["si"], half2: ["si"] },
      mar: { half1: ["si", "t"], half2: ["t"] },
      apr: { half1: ["t"], half2: [] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: ["s"], half2: ["s"] },
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
      apr: { half1: [], half2: [] },
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
      feb: { half1: ["sg"], half2: ["s"] },
      mar: { half1: ["s"], half2: ["s"] },
      apr: { half1: [], half2: [] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: ["s"], half2: ["s"] },
      oct: { half1: [], half2: [] },
      nov: { half1: [], half2: [] },
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
      feb: { half1: ["sg"], half2: ["s"] },
      mar: { half1: ["s"], half2: ["s"] },
      apr: { half1: [], half2: [] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: ["s"], half2: ["s"] },
      oct: { half1: [], half2: [] },
      nov: { half1: [], half2: [] },
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
      feb: { half1: ["sg"], half2: ["s"] },
      mar: { half1: ["s"], half2: ["s"] },
      apr: { half1: [], half2: [] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: ["s"], half2: ["s"] },
      oct: { half1: [], half2: [] },
      nov: { half1: [], half2: [] },
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
      feb: { half1: ["sg"], half2: ["s"] },
      mar: { half1: ["s"], half2: ["s"] },
      apr: { half1: [], half2: [] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: ["s"], half2: ["s"] },
      oct: { half1: [], half2: [] },
      nov: { half1: [], half2: [] },
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
      jan: { half1: [], half2: ["sg", "si"] },
      feb: { half1: ["s"], half2: ["s"] },
      mar: { half1: ["s"], half2: ["s"] },
      apr: { half1: [], half2: [] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: ["s"], half2: ["s"] },
      oct: { half1: ["s"], half2: ["sg"] },
      nov: { half1: [], half2: [] },
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
      jan: { half1: [], half2: [] },
      feb: { half1: ["sg", "si"], half2: ["si", "sg"] },
      mar: { half1: ["si"], half2: ["t"] },
      apr: { half1: ["t"], half2: [] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: ["s"], half2: ["s"] },
      oct: { half1: ["sg", "si"], half2: [] },
      nov: { half1: [], half2: [] },
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
      jan: { half1: [], half2: [] },
      feb: { half1: ["sg", "si"], half2: ["sg", "si"] },
      mar: { half1: [], half2: ["s", "t"] },
      apr: { half1: ["s", "t"], half2: ["s"] },
      may: { half1: ["s"], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: ["s"], half2: ["s"] },
      sep: { half1: ["s", "t"], half2: ["s", "t"] },
      oct: { half1: ["sg"], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
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
      feb: { half1: [], half2: ["sg"] },
      mar: { half1: ["s"], half2: ["s"] },
      apr: { half1: ["s"], half2: [] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: ["s"] },
      sep: { half1: ["s"], half2: ["s"] },
      oct: { half1: ["s"], half2: [] },
      nov: { half1: ["sg"], half2: [] },
      dec: { half1: [], half2: [] }
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
      feb: { half1: ["si"], half2: ["si"] },
      mar: { half1: ["si"], half2: ["si"] },
      apr: { half1: [], half2: ["tg"] },
      may: { half1: ["t", "tg"], half2: ["t"] },
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
    id: 26,
    name: "Tomatoes",
    type: "vegetable",
    spacing: "18",
    daysToHarvest: "T = 75-85, S = 125-135**",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: ["si"], half2: ["si"] },
      mar: { half1: ["si"], half2: ["si"] },
      apr: { half1: ["tg"], half2: ["t", "tg"] },
      may: { half1: ["t"], half2: ["t"] },
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
    id: 27,
    name: "Strawberries (Bare-root)",
    type: "vegetable",
    spacing: "",
    daysToHarvest: "",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: ["t"], half2: ["t"] },
      mar: { half1: ["t"], half2: ["t"] },
      apr: { half1: [], half2: [] },
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
    id: 29,
    name: "Eggplant",
    type: "vegetable",
    spacing: "24",
    daysToHarvest: "T = 90-95, S = 150-155**",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: ["si"] },
      mar: { half1: ["si"], half2: ["si"] },
      apr: { half1: ["si"], half2: ["tg"] },
      may: { half1: ["tg"], half2: ["t"] },
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
    id: 30,
    name: "Calendula",
    type: "flower",
    spacing: "8-12",
    daysToHarvest: "S = 50-70",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: ["si"] },
      mar: { half1: ["si", "s"], half2: ["s", "t"] },
      apr: { half1: ["s", "t"], half2: ["s"] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: ["s"] },
      sep: { half1: ["s"], half2: ["s"] },
      oct: { half1: ["s"], half2: [] },
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
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: ["si"], half2: ["si"] },
      apr: { half1: ["t"], half2: ["t"] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: ["si"], half2: ["si"] },
      sep: { half1: ["t"], half2: ["t"] },
      oct: { half1: [], half2: [] },
      nov: { half1: [], half2: [] },
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
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: ["si"], half2: ["si"] },
      apr: { half1: ["t"], half2: ["t"] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: ["si"], half2: ["si"] },
      sep: { half1: ["t"], half2: ["t"] },
      oct: { half1: [], half2: [] },
      nov: { half1: [], half2: [] },
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
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: ["si"], half2: ["si"] },
      apr: { half1: ["t"], half2: ["t"] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: ["si"], half2: ["si"] },
      sep: { half1: ["t"], half2: ["t"] },
      oct: { half1: [], half2: [] },
      nov: { half1: [], half2: [] },
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
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: ["si"] },
      apr: { half1: ["si"], half2: ["t"] },
      may: { half1: ["t"], half2: [] },
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
    id: 35,
    name: "Basil",
    type: "vegetable",
    spacing: "2-8",
    daysToHarvest: "T = 14-35, S = 50-75",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: ["si"] },
      apr: { half1: ["si"], half2: [] },
      may: { half1: ["t"], half2: ["s", "t"] },
      jun: { half1: ["s"], half2: ["s"] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: [], half2: [] },
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
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: ["s"] },
      apr: { half1: ["s"], half2: ["s"] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: ["s"], half2: ["s"] },
      sep: { half1: ["s"], half2: ["s"] },
      oct: { half1: [], half2: [] },
      nov: { half1: [], half2: [] },
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
      mar: { half1: [], half2: ["s"] },
      apr: { half1: ["s"], half2: [] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: ["s"], half2: ["s"] },
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
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: ["s"] },
      apr: { half1: ["s"], half2: ["s"] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: ["s"], half2: ["s"] },
      sep: { half1: ["s"], half2: ["s"] },
      oct: { half1: [], half2: [] },
      nov: { half1: [], half2: [] },
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
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: ["s"] },
      apr: { half1: ["s"], half2: [] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: ["s"] },
      sep: { half1: ["s"], half2: ["s"] },
      oct: { half1: ["s"], half2: [] },
      nov: { half1: [], half2: [] },
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
      jan: { half1: [], half2: ["si"] },
      feb: { half1: ["si"], half2: ["si"] },
      mar: { half1: ["s"], half2: ["s", "t"] },
      apr: { half1: ["s", "t"], half2: ["s"] },
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
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: ["si"] },
      apr: { half1: ["si"], half2: ["t"] },
      may: { half1: ["t"], half2: [] },
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
      mar: { half1: [], half2: ["si"] },
      apr: { half1: ["si"], half2: ["t"] },
      may: { half1: ["s", "t"], half2: [] },
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
      mar: { half1: [], half2: ["s"] },
      apr: { half1: ["s"], half2: ["s"] },
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
    id: 46,
    name: "Dill",
    type: "vegetable",
    spacing: "2-4",
    daysToHarvest: "40-55",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: ["s"] },
      apr: { half1: ["s"], half2: ["s"] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: ["s"], half2: ["s"] },
      oct: { half1: [], half2: [] },
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
      mar: { half1: [], half2: ["si"] },
      apr: { half1: ["si"], half2: ["s", "t"] },
      may: { half1: ["s"], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: ["s"], half2: ["s"] },
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
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: ["s"] },
      apr: { half1: ["s"], half2: ["s"] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: ["s"], half2: ["s"] },
      oct: { half1: ["sg"], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
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
      mar: { half1: [], half2: ["si"] },
      apr: { half1: ["si"], half2: ["tg"] },
      may: { half1: ["t"], half2: [] },
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
    id: 50,
    name: "Cabbage (Chinese)",
    type: "vegetable",
    spacing: "12",
    daysToHarvest: "T = 45-55, S = 75-85",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: ["si"] },
      apr: { half1: ["si"], half2: ["t"] },
      may: { half1: ["t"], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: ["si"], half2: ["si"] },
      sep: { half1: ["t"], half2: ["t"] },
      oct: { half1: ["tg"], half2: [] },
      nov: { half1: [], half2: [] },
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
      apr: { half1: ["si"], half2: ["s", "t"] },
      may: { half1: ["s", "t"], half2: ["s", "t"] },
      jun: { half1: ["s"], half2: ["s"] },
      jul: { half1: ["s"], half2: [] },
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
      apr: { half1: ["si"], half2: ["si"] },
      may: { half1: ["s", "t"], half2: ["s", "t"] },
      jun: { half1: ["s"], half2: ["s"] },
      jul: { half1: ["s"], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: [], half2: [] },
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
      apr: { half1: ["si"], half2: ["si"] },
      may: { half1: ["s", "t"], half2: ["s", "t"] },
      jun: { half1: ["s"], half2: ["s"] },
      jul: { half1: ["s"], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: [], half2: [] },
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
      mar: { half1: [], half2: [] },
      apr: { half1: ["si"], half2: ["si"] },
      may: { half1: ["s", "t"], half2: ["s", "t"] },
      jun: { half1: ["s"], half2: ["s"] },
      jul: { half1: [], half2: [] },
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
      mar: { half1: [], half2: [] },
      apr: { half1: ["si"], half2: ["si"] },
      may: { half1: ["s", "t"], half2: ["s"] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: ["s"], half2: ["s"] },
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
      mar: { half1: [], half2: [] },
      apr: { half1: [], half2: [] },
      may: { half1: ["s"], half2: ["s"] },
      jun: { half1: ["s"], half2: ["s"] },
      jul: { half1: ["s"], half2: [] },
      aug: { half1: [], half2: [] },
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
      apr: { half1: ["si"], half2: ["si"] },
      may: { half1: ["s", "t"], half2: ["s", "t"] },
      jun: { half1: ["s"], half2: ["s"] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: [], half2: [] },
      oct: { half1: [], half2: [] },
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
      apr: { half1: [], half2: ["si"] },
      may: { half1: ["s", "t"], half2: ["s", "t"] },
      jun: { half1: ["s"], half2: ["s"] },
      jul: { half1: ["s"], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: [], half2: [] },
      oct: { half1: [], half2: [] },
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
      may: { half1: [], half2: ["t"] },
      jun: { half1: ["t"], half2: ["t"] },
      jul: { half1: ["t"], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: [], half2: [] },
      oct: { half1: [], half2: [] },
      nov: { half1: [], half2: [] },
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
      apr: { half1: [], half2: [] },
      may: { half1: [], half2: ["s"] },
      jun: { half1: ["s"], half2: ["s"] },
      jul: { half1: ["s"], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: [], half2: [] },
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
      apr: { half1: [], half2: [] },
      may: { half1: [], half2: ["s"] },
      jun: { half1: ["s"], half2: ["s"] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: [], half2: [] },
      oct: { half1: [], half2: [] },
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
      apr: { half1: ["si"], half2: ["si"] },
      may: { half1: ["s", "t"], half2: ["s", "t"] },
      jun: { half1: ["s"], half2: ["s"] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: [], half2: [] },
      oct: { half1: [], half2: [] },
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
      may: { half1: ["si"], half2: ["s", "t"] },
      jun: { half1: ["s"], half2: ["s"] },
      jul: { half1: ["s"], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: [], half2: [] },
      oct: { half1: [], half2: [] },
      nov: { half1: [], half2: [] },
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
      apr: { half1: [], half2: [] },
      may: { half1: [], half2: ["s"] },
      jun: { half1: ["s"], half2: ["s"] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: [], half2: [] },
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
      apr: { half1: [], half2: ["si"] },
      may: { half1: ["s", "t"], half2: ["s", "t"] },
      jun: { half1: ["s"], half2: ["s"] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: [], half2: [] },
      oct: { half1: [], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
    }
  },
  {
    id: 66,
    name: "Brussels",
    type: "vegetable",
    spacing: "14-18",
    daysToHarvest: "T = 40-50, S = 90-100**",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: [] },
      apr: { half1: [], half2: [] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: ["si"], half2: ["si"] },
      sep: { half1: ["t"], half2: ["t"] },
      oct: { half1: [], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
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
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: [] },
      apr: { half1: [], half2: [] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: ["s"] },
      sep: { half1: ["s"], half2: ["s"] },
      oct: { half1: ["s"], half2: [] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
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
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: [], half2: [] },
      oct: { half1: ["s"], half2: ["s"] },
      nov: { half1: ["s"], half2: [] },
      dec: { half1: [], half2: [] }
    }
  }
];
// Plant Guide Data - integrated from carrboro_plant_guide.csv

const PLANT_GUIDE = {
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
    tipsText: `High organic matter boosts leaf size. Mulch for soil moisture. Smooth-leaf types easier to clean and less prone to rot. Upright varieties keep leaves off soil. pH 6.5-7.0 preferred.`
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
    tipsText: `Remove lower leaves for airflow. Tolerates poor soil but thrives with compost. Flavor sweetens after frost. Bt for cabbage worms. Russian/Siberian types stay tender longer. Tall varieties reduce bottom rot. Use floating row covers to exclude pests.`
  }, 
  "Collard Greens": {
    varietiesText: `Senposai (cabbage/mustard cross, massive yield—must grow +++), Champion (slow to bolt), Flash (hybrid, fast regrowth), Georgia Southern (heirloom, heat tolerant), Morris Heading (forms loose heads)`,
    tipsText: `Extremely forgiving. Harvest outer leaves continuously. Responds well to nitrogen. Bt for caterpillars. Flavor improves dramatically after frost.`
  }, 
  "Bok Choy": {
    varietiesText: `Joi Choi (bolt resistant, huge white stalks), Mei Qing Choi (baby, green stem), Win-Win Choi (heat tolerant)`,
    tipsText: `Loose soil prevents root stress. Mulch keeps stems tender. Consistent moisture essential. Floating row cover for flea beetles. Extremely bolt-sensitive to temperature swings.`
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
    tipsText: `Prune lower leaves for airflow. Mulch heavily. Consistent watering critical to prevent cracking. Deep transplanting—bury 2/3 of stem. Single-leader pruning essential for disease-prone heirlooms. Add calcium. Cherokee Purple prone to cat-facing (cold damage) and concentric cracking—needs extra airflow. Grafting onto disease-resistant rootstock (RST, DRO) extends season—keep graft union ABOVE soil. 'Plus' hybrid varieties show superior disease resistance and longer harvest windows in local trials.`
  }, 
  "Strawberries (Bare-root)": {
    varietiesText: `Chandler (NC Piedmont standard, high yield, excellent flavor), Camarosa (large firm fruit, heat tolerant), Sweet Charlie (early, high sugar)`,
    tipsText: `Full sun. Plant plugs on black plastic mulch. Remove early flowers for root establishment. Straw mulch helps. Plant with crown at soil level. Use row covers to protect blossoms from late frost.`
  }, 
  "Potatoes (Irish)": {
    varietiesText: `Kennebec (standard white, disease resistant), Yukon Gold (buttery, early), Red Pontiac (waxy)`,
    tipsText: `Hill soil to prevent greening. Loose soil improves tuber size. Use certified seed potatoes. Use straw mulch to protect shoots from late frost. Cure before storage. Rotate planting location annually.`
  }, 
  "Eggplant": {
    varietiesText: `Orient Express (Asian, early, cool-tolerant), Ping Tung (long Asian, tender), Ichiban (long, productive), Nadia (black, productive), Black Beauty (classic), Fairy Tale (small, tender)`,
    tipsText: `Stake early. Remove early flowers for vigor. Loves heat + compost. Harvest when skin is glossy (dull = overripe). Flea beetles riddle leaves—use insect netting or row cover until plants are large enough to withstand damage.`
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
    varietiesText: `Common culinary sage (standard), Berggarten (large leaves, rarely flowers), Tricolor (ornamental, edible)`,
    tipsText: `Excellent drainage required—hates wet feet in NC clay. Add sand/gravel to planting area. Perennial. Prune after flowering to maintain shape.`
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
    varietiesText: `Bubba (large rhizomes), Chinese Yellow (vigorous), Common Culinary. Note: Grocery store ginger often treated to prevent sprouting—buy seed ginger.`,
    tipsText: `Needs warmth + rich moist soil. Thrives in greenhouse or protected beds. Pre-sprout rhizomes in pots on heat mats. Harvest as 'baby ginger' (cream-colored, no skin)—tender, fiber-free, freezes well.`
  }, 
  "Cabbage (Chinese)": {
    varietiesText: `Blues (Napa, disease resistant), Napa Michihili (tall), Wong Bok (barrel-shaped), Rubicon (mini), Tokyo Bekana (loose head, bolt resistant)`,
    tipsText: `Loose soil prevents splitting. Consistent moisture essential. Floating row cover for flea beetles. Extremely bolt-sensitive to temperature swings. Grows fast even in low light.`
  }, 
  "Squash (Summer)": {
    varietiesText: `Zephyr (bicolor crookneck, nutty), Costata Romanesco (ribbed zucchini, best flavor), Success PM (powdery mildew resistant), Dunja (zucchini, mildew tolerant), Tatume/Calabacita (vining, vine borer resistant)`,
    tipsText: `Powdery mildew resistant varieties important. Harvest frequently at 6-8". Good airflow matters. Row covers until flowering for vine borer protection—must remove or hand-pollinate when flowers appear.`
  }, 
  "Cucumbers": {
    varietiesText: `Marketmore 76 (slicing, disease resistant), Diva (sweet, seedless, spineless), General Lee (slicing), Calypso (pickling), Socrates (parthenocarpic—no pollination needed)`,
    tipsText: `Trellis for airflow and straight fruit. Consistent moisture prevents bitterness. Harvest daily at peak. Row cover early for cucumber beetles. Parthenocarpic varieties ideal for enclosed growing. Water at base—never overhead—to prevent downy mildew.`
  }, 
  "Corn (Sweet)": {
    varietiesText: `Silver Queen (white, classic SU), Ambrosia (bicolor, excellent SE), Bodacious (SE, sweet), Incredible (sugary enhanced), Peaches and Cream (bicolor)`,
    tipsText: `Heavy feeder—side dress when knee high. Block planting (not single rows) essential for pollination. Consistent moisture at tasseling critical. Do not plant super-sweet (sh2) near standard types—cross-pollination turns kernels starchy.`
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
    varietiesText: `Iron & Clay (cowpea, heat tolerant), Pinkeye Purple Hull (Southern pea), Mississippi Silver (Southern pea), Austrian Winter (cover crop)`,
    tipsText: `Ultimate survival crop—thrives in heat and drought that kills everything else. Excellent soil builder and cover crop. Minimal care required. Fixes nitrogen for following crops.`
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
  }
};

// Helper function to get plant guide data
function getPlantGuide(plantName) {
  return PLANT_GUIDE[plantName] || null;
}

// Check if a plant has guide data available
function hasGuideData(plantName) {
  return PLANT_GUIDE.hasOwnProperty(plantName);
}
