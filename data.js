// Planting Calendar Data
// Zone 8a - Piedmont Region

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
  s: "Sow Outdoors",
  sg: "Sow Greenhouse",
  tg: "Transplant Greenhouse",
  h: "Harvest",
  o: "Other",
  B: "Bulb Planting"
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
      jan: { half1: ["sg", "si"], half2: ["sg", "si"] },
      feb: { half1: ["s", "sg"], half2: ["s", "sg"] },
      mar: { half1: ["s"], half2: ["s"] },
      apr: { half1: [], half2: [] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: ["s"], half2: ["s"] },
      oct: { half1: ["s"], half2: ["s"] },
      nov: { half1: ["sg"], half2: ["sg"] },
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
      jan: { half1: ["sg", "si"], half2: ["sg", "si"] },
      feb: { half1: ["sg", "si"], half2: ["si"] },
      mar: { half1: ["s", "t"], half2: ["s", "t"] },
      apr: { half1: [], half2: [] },
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
    id: 3,
    name: "Radishes",
    type: "vegetable",
    spacing: "1",
    daysToHarvest: "20-25",
    months: {
      jan: { half1: ["sg"], half2: ["sg"] },
      feb: { half1: ["s", "sg"], half2: ["s"] },
      mar: { half1: ["s"], half2: ["s"] },
      apr: { half1: [], half2: [] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: ["s"], half2: ["s"] },
      oct: { half1: ["s"], half2: ["s"] },
      nov: { half1: ["sg"], half2: [] },
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
      jan: { half1: ["sg", "si"], half2: ["sg", "si"] },
      feb: { half1: ["s", "sg"], half2: ["s"] },
      mar: { half1: ["s", "t"], half2: ["s", "t"] },
      apr: { half1: ["s"], half2: [] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: ["si"], half2: ["s"] },
      sep: { half1: ["s", "t"], half2: ["s", "t"] },
      oct: { half1: ["s"], half2: ["sg"] },
      nov: { half1: ["sg"], half2: [] },
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
      feb: { half1: ["s"], half2: ["s"] },
      mar: { half1: ["s"], half2: ["s"] },
      apr: { half1: ["s"], half2: [] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: ["s"], half2: ["s"] },
      sep: { half1: ["s"], half2: ["s"] },
      oct: { half1: ["sg"], half2: [] },
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
      jan: { half1: ["sg", "si"], half2: ["sg", "si"] },
      feb: { half1: ["s", "sg"], half2: ["s", "sg"] },
      mar: { half1: ["s"], half2: ["s"] },
      apr: { half1: [], half2: [] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: ["s"] },
      sep: { half1: ["s"], half2: ["s"] },
      oct: { half1: ["s"], half2: [] },
      nov: { half1: ["sg"], half2: ["sg"] },
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
      feb: { half1: ["si"], half2: ["si"] },
      mar: { half1: ["si"], half2: [] },
      apr: { half1: ["tg"], half2: ["t"] },
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
    id: 8,
    name: "Onions, Bulb",
    type: "vegetable",
    spacing: "4",
    daysToHarvest: "90-120",
    months: {
      jan: { half1: [], half2: [] },
      feb: { half1: [], half2: [] },
      mar: { half1: [], half2: [] },
      apr: { half1: [], half2: [] },
      may: { half1: [], half2: [] },
      jun: { half1: [], half2: [] },
      jul: { half1: [], half2: [] },
      aug: { half1: [], half2: [] },
      sep: { half1: ["s"], half2: ["s"] },
      oct: { half1: ["s"], half2: ["s"] },
      nov: { half1: [], half2: [] },
      dec: { half1: [], half2: [] }
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
      mar: { half1: [], half2: [] },
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
    id: 10,
    name: "Kale",
    type: "vegetable",
    spacing: "6",
    daysToHarvest: "14-22, 40-50",
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
