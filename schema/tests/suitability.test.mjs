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
import { bucketWindows, SLOTS } from "../engine/resolve.ts";
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
  // No tomato planting in peak summer (jun..jul, slots 10..13) — 107°F kills set.
  for (const i of tomatoes) assert.ok(!(i >= 10 && i <= 13), `tomatoes should skip peak-summer slot ${i}`);
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

test("perennials and DTH-less crops produce no suitability estimate", () => {
  const climate = modelSiteClimate(siteFor(CHAPEL_HILL));
  assert.equal(suitabilityFor(CROP_CATALOG["asparagus"], climate), null); // perennial
  assert.equal(suitabilityFor(CROP_CATALOG["yarrow"], climate), null); // no numeric DTH
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
