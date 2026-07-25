// Climate-suitability engine tests (node:test — no dependencies).
// Covers the crop-climate enrichment, the frost-derived climate model (fit
// quality + the honest frost-free refusal), and the suitability scorer
// (season placement, overwinter handling, perennial/no-DTH silence).
//
// The climate model needs a full multi-threshold frost table, so these load the
// real seed stations from app/data (Chapel Hill = temperate, Phoenix = desert).

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { climateFor } from "../climate/crop-climate.ts";
import {
  ClimateModelError,
  modelSiteClimate,
  realSiteClimate,
  minTempF,
  maxTempF,
} from "../engine/climate-model.ts";
import { suitabilityFor } from "../engine/suitability.ts";
import { bucketWindows, SLOTS, resolveAll } from "../engine/resolve.ts";
import { CROP_CATALOG } from "../crop-catalog.ts";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const STATIONS = JSON.parse(
  fs.readFileSync(path.join(ROOT, "app/data/frost-stations.json"), "utf8")
).stations;
const TEMP_NORMALS = JSON.parse(
  fs.readFileSync(path.join(ROOT, "app/data/temp-normals.json"), "utf8")
).stations;
const tempFor = (id) => TEMP_NORMALS.find((s) => s.id === id);

function siteFor(id) {
  const s = STATIONS.find((x) => x.id === id);
  if (!s) throw new Error(`no station ${id}`);
  return {
    lat: s.lat, lng: s.lng, zone: "?",
    frostFreeDays: s.firstFrost["32/50"] - s.lastFrost["32/50"],
    frost: { lastFrost: s.lastFrost, firstFrost: s.firstFrost, station: { id: s.id, distanceKm: 0 } },
    datasetVersions: {},
  };
}
const CHAPEL_HILL = "USC00311677";
const PHOENIX = "USW00023183";

/** Outdoor planting slot indices (s/t/B) from a suitability result. */
function outdoorSlots(slug, climate) {
  const res = suitabilityFor(CROP_CATALOG[slug], climate);
  if (!res) return null;
  const set = new Set();
  const grid = bucketWindows(res.windows);
  SLOTS.forEach((sl, i) => {
    if ((grid[sl.month][sl.half] || []).some((c) => ["s", "t", "B"].includes(c))) set.add(i);
  });
  return set;
}
const isSummer = (i) => i >= 8 && i <= 13; // may..jul
const isWinter = (i) => i <= 3 || i >= 22; // jan..feb, dec

// --- crop-climate enrichment -------------------------------------------------

test("climateFor is null for perennials, populated for annuals", () => {
  assert.equal(climateFor(CROP_CATALOG["asparagus"]), null);
  const tom = climateFor(CROP_CATALOG["tomatoes"]);
  assert.ok(tom);
  assert.equal(tom.season, "warm");
  assert.equal(tom.frostKilled, true);
  const kale = climateFor(CROP_CATALOG["kale"]);
  assert.equal(kale.season, "cool");
  assert.equal(kale.frostKilled, false);
});

test("crop overrides win over hardiness-class defaults", () => {
  // okra is a heat-lover: its ceiling is raised well above the tender default 95.
  assert.ok(climateFor(CROP_CATALOG["okra"]).ceilingF >= 100);
  // lettuce bolts: its ceiling is pulled below the cool-class default.
  assert.ok(climateFor(CROP_CATALOG["lettuce-leaf"]).ceilingF <= 80);
});

// --- climate model -----------------------------------------------------------

test("modelSiteClimate fits Chapel Hill tightly and crosses 32°F at the real frost dates", () => {
  const site = siteFor(CHAPEL_HILL);
  const c = modelSiteClimate(site);
  assert.ok(c.rmseF < 2, `RMSE ${c.rmseF} should be < 2°F`);
  assert.ok(c.points >= 8);
  assert.equal(c.heatModeled, false);
  // The fitted min curve should be within a couple °F of freezing on the real
  // last/first 32°F/50% dates.
  assert.ok(Math.abs(minTempF(c, site.frost.lastFrost["32/50"]) - 32) < 3);
  assert.ok(Math.abs(minTempF(c, site.frost.firstFrost["32/50"]) - 32) < 3);
});

test("modelSiteClimate refuses a frost-free desert (Phoenix) honestly", () => {
  assert.throws(() => modelSiteClimate(siteFor(PHOENIX)), ClimateModelError);
});

test("realSiteClimate adjustF lapse-shifts the curve and moves frost dates", () => {
  const st = tempFor(CHAPEL_HILL);
  const base = realSiteClimate(st);
  const colder = realSiteClimate(st, -9); // ~ +770 m elevation
  // Every slot is exactly 9°F colder on both min and max.
  for (let i = 0; i < 24; i++) {
    assert.ok(Math.abs((base.tminF[i] - colder.tminF[i]) - 9) < 1e-6);
    assert.ok(Math.abs((base.tmaxF[i] - colder.tmaxF[i]) - 9) < 1e-6);
  }
  // A colder site freezes later in spring and earlier in fall (shorter season).
  assert.ok(colder.lastFrostDay >= base.lastFrostDay);
  assert.ok(colder.firstFrostDay <= base.firstFrostDay);
});

test("temperature seed carries station elevation (meters)", () => {
  const phx = tempFor(PHOENIX);
  assert.equal(typeof phx.elevM, "number");
  assert.ok(phx.elevM > 200 && phx.elevM < 500, `Phoenix elevM ${phx.elevM} should be ~337 m`);
});

test("realSiteClimate carries the real heat wall (max temp), heatModeled=true", () => {
  const cha = realSiteClimate(tempFor(CHAPEL_HILL));
  assert.equal(cha.heatModeled, true);
  assert.equal(cha.source, "ncei-daily-normals");
  // Real Chapel Hill summer max ~90°F (the frost-derived model underestimated this).
  assert.ok(Math.max(...cha.tmaxF) > 85, "summer max should exceed 85°F");
  assert.ok(maxTempF(cha, 196) > 85, "mid-July max should exceed 85°F"); // ~day 196
});

test("realSiteClimate handles the frost-free desert instead of refusing it", () => {
  const phx = realSiteClimate(tempFor(PHOENIX));
  assert.equal(phx.heatModeled, true);
  assert.ok(Math.max(...phx.tmaxF) > 100, "Phoenix summer max should exceed 100°F");
  assert.ok(Number.isNaN(phx.lastFrostDay), "Phoenix is frost-free (no 32°F crossing)");
});

test("in the desert, warm crops avoid peak summer and cool crops take winter", () => {
  const phx = realSiteClimate(tempFor(PHOENIX));
  const tomatoes = outdoorSlots("tomatoes", phx);
  assert.ok(tomatoes && tomatoes.size);
  // No tomato planting in the 107°F peak (jun h2..jul h1, slots 11..12). Late
  // July (jul h2, slot 13) is allowed — the documented low-desert fall-tomato
  // planting start, set into heat under shade for an autumn harvest (az1005).
  for (const i of tomatoes) assert.ok(!(i >= 11 && i <= 12), `tomatoes should skip peak-summer slot ${i}`);
  // Lettuce should be plantable in the cool season around winter.
  const lettuce = outdoorSlots("lettuce-leaf", phx);
  assert.ok(lettuce && [...lettuce].some((i) => isWinter(i)), "lettuce should take the desert winter");
});

// --- suitability scorer ------------------------------------------------------

test("a tender crop is placed in the frost-free season, never mid-winter", () => {
  const climate = modelSiteClimate(siteFor(CHAPEL_HILL));
  const slots = outdoorSlots("tomatoes", climate);
  assert.ok(slots && slots.size);
  for (const i of slots) assert.ok(!isWinter(i), `tomatoes should not plant in winter slot ${i}`);
});

test("a cool crop avoids peak summer (spring/fall placement)", () => {
  const climate = modelSiteClimate(siteFor(CHAPEL_HILL));
  const slots = outdoorSlots("spinach", climate);
  assert.ok(slots && slots.size);
  // Spinach (bolts in heat) should have at least one non-summer slot.
  assert.ok([...slots].some((i) => !isSummer(i)));
});

test("overwintered garlic gets a fall plantSet window, not spring", () => {
  const climate = modelSiteClimate(siteFor(CHAPEL_HILL));
  const res = suitabilityFor(CROP_CATALOG["garlic"], climate);
  assert.ok(res);
  assert.equal(res.windows.length, 1);
  assert.equal(res.windows[0].activity, "plantSet");
  const grid = bucketWindows(res.windows);
  // Should cover fall (sep..nov), and not spring (mar..may).
  const fall = ["sep", "oct", "nov"].some((m) => (grid[m].half1.length || grid[m].half2.length));
  const spring = ["mar", "apr", "may"].some((m) => (grid[m].half1.length || grid[m].half2.length));
  assert.ok(fall, "garlic should be planted in fall");
  assert.ok(!spring, "garlic should not be planted in spring");
});

test("night fruit-set limits warm fruiting crops in hot-night climates", () => {
  // Phoenix summer nights (~84°F) fail tomato/pepper fruit set even with no frost.
  const phx = realSiteClimate(tempFor(PHOENIX));
  const cc = climateFor(CROP_CATALOG["tomatoes"]);
  assert.equal(cc.nightSetMaxF, 72, "tomatoes should carry a night fruit-set limit");
  const tom = suitabilityFor(CROP_CATALOG["tomatoes"], phx);
  // No planting whose fruiting stage lands in the hot-night peak (jul, slots 12-13).
  const slots = new Set();
  const grid = bucketWindows(tom.windows);
  SLOTS.forEach((sl, i) => {
    if ((grid[sl.month][sl.half] || []).some((c) => ["s", "t", "B"].includes(c))) slots.add(i);
  });
  assert.ok(![12, 13].some((i) => slots.has(i)), "no tomato planting into the Jul hot-night peak");
  // Peppers (both hot- and cold-night limits) surface the night-heat reason.
  const pep = suitabilityFor(CROP_CATALOG["peppers"], phx);
  assert.ok(pep && pep.windows.length);
  assert.ok(pep.windows.some((w) => w.limiting === "night-heat"), "peppers should be night-heat limited in the desert");
});

test("resolveAll uses the suitability engine when a climate is supplied", () => {
  const site = siteFor(CHAPEL_HILL);
  const climate = realSiteClimate(tempFor(CHAPEL_HILL));
  const withClimate = resolveAll(site, { catalog: CROP_CATALOG, packs: [] }, climate);
  const withoutClimate = resolveAll(site, { catalog: CROP_CATALOG, packs: [] });
  assert.ok(withClimate.length, "climate path should produce computed rows");
  // Suitability rows carry a confidence + limiting reason; offset rows do not.
  const tom = withClimate.find((c) => c.crop === "tomatoes");
  assert.ok(tom && tom.origin === "computed");
  assert.ok(tom.confidence > 0 && tom.confidence <= 1);
  assert.ok(typeof tom.limiting === "string");
  const tomOffset = withoutClimate.find((c) => c.crop === "tomatoes");
  assert.equal(tomOffset.confidence, undefined, "offset rows carry no confidence");
});

test("resolveAll with a real climate produces a calendar for a frost-free desert", () => {
  const phxFrost = siteFor(PHOENIX);
  const phxClimate = realSiteClimate(tempFor(PHOENIX));
  // The suitability engine (real heat wall) produces a full desert calendar with
  // reason codes — where the frost-offset engine can at best emit frost-anchored
  // nonsense. Every computed row carries a confidence + limiting factor.
  const suit = resolveAll(phxFrost, { catalog: CROP_CATALOG, packs: [] }, phxClimate);
  assert.ok(suit.length > 10, "suitability engine produces a desert calendar");
  for (const c of suit) {
    assert.equal(c.origin, "computed");
    assert.ok(c.confidence > 0 && c.confidence <= 1, `bad confidence for ${c.crop}`);
    assert.ok(typeof c.limiting === "string");
  }
});

test("perennials and DTH-less crops produce no suitability estimate", () => {
  const climate = modelSiteClimate(siteFor(CHAPEL_HILL));
  assert.equal(suitabilityFor(CROP_CATALOG["asparagus"], climate), null); // perennial
  assert.equal(suitabilityFor(CROP_CATALOG["yarrow"], climate), null); // no numeric DTH
});

test("windows carry a probabilistic confidence and a limiting reason code", () => {
  const climate = realSiteClimate(tempFor(CHAPEL_HILL));
  const res = suitabilityFor(CROP_CATALOG["tomatoes"], climate);
  assert.ok(res && res.windows.length);
  const VALID = new Set(["soil-temp", "frost", "heat", "cold-growth"]);
  for (const w of res.windows) {
    assert.ok(w.confidence > 0 && w.confidence <= 1, `confidence ${w.confidence} out of (0,1]`);
    assert.ok(VALID.has(w.limiting), `bad limiting reason "${w.limiting}"`);
    // Real spread ⇒ genuinely probabilistic (not a degenerate 0/1 step).
    assert.ok(w.confidence < 1, "with real spread, confidence should be a true probability < 1");
  }
});

test("the spread makes factors probabilistic (real) vs degenerate (frost-derived)", () => {
  // Real climate carries stddev, so a warm crop's summer confidence is a fraction.
  const real = suitabilityFor(CROP_CATALOG["tomatoes"], realSiteClimate(tempFor(CHAPEL_HILL)));
  const anyFractional = real.windows.some((w) => w.confidence > 0.01 && w.confidence < 0.99);
  assert.ok(anyFractional, "real spread should yield fractional confidences");
  // The frost-derived fallback has zero spread → still produces windows (steps).
  const derived = suitabilityFor(CROP_CATALOG["tomatoes"], modelSiteClimate(siteFor(CHAPEL_HILL)));
  assert.ok(derived && derived.windows.length, "frost-derived fallback must still emit windows");
});

test("the 24-slot curve and windows are consistent", () => {
  const climate = modelSiteClimate(siteFor(CHAPEL_HILL));
  const res = suitabilityFor(CROP_CATALOG["beans-snap-bush"], climate);
  assert.ok(res);
  assert.equal(res.curve.length, 365);
  assert.equal(res.slotCurve.length, 24);
  // Every slot the windows cover should have a positive suitability score.
  const grid = bucketWindows(res.windows);
  SLOTS.forEach((sl, i) => {
    if ((grid[sl.month][sl.half] || []).length) assert.ok(res.slotCurve[i] > 0, `slot ${i} covered but zero score`);
  });
});
