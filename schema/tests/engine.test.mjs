// Offset-engine unit tests (node:test — no dependencies).
// Covers anchor resolution, derived harvests, season-day cross-year bucketing,
// photoperiod, footprints, and resolver precedence semantics.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  anchorDay,
  bucketWindows,
  byPrecedence,
  calendarDayOfYear,
  daylengthHours,
  emptyGrid,
  footprintContains,
  frostDay,
  normalizeDay,
  photoperiodCrossing,
  resolveAll,
  resolveAnchoredEvents,
  resolveCropTiming,
  UnsupportedAnchorError,
} from "../engine/resolve.ts";
import { PIEDMONT_NC } from "../packs/piedmont-nc.ts";
import { CROP_CATALOG } from "../crop-catalog.ts";

const SITE = {
  lat: 35.91,
  lng: -79.08,
  zone: "8a",
  frostFreeDays: 196,
  frost: {
    lastFrost: { "32/50": 105, "32/10": 124 },
    firstFrost: { "32/50": 301 },
    station: { id: "fixture", distanceKm: 0 },
  },
  datasetVersions: { ncei: "1991-2020" },
};

// --- calendar geometry -----------------------------------------------------

test("calendarDayOfYear (non-leap)", () => {
  assert.equal(calendarDayOfYear(1, 1), 1);
  assert.equal(calendarDayOfYear(3, 1), 60);
  assert.equal(calendarDayOfYear(4, 15), 105);
  assert.equal(calendarDayOfYear(10, 28), 301);
  assert.equal(calendarDayOfYear(12, 31), 365);
  assert.throws(() => calendarDayOfYear(2, 30));
});

test("normalizeDay wraps both directions", () => {
  assert.equal(normalizeDay(1), 1);
  assert.equal(normalizeDay(365), 365);
  assert.equal(normalizeDay(366), 1);
  assert.equal(normalizeDay(375), 10);
  assert.equal(normalizeDay(0), 365);
  assert.equal(normalizeDay(-10), 355);
});

// --- anchors ---------------------------------------------------------------

test("frost anchors: default ref, explicit ref, missing key throws", () => {
  assert.equal(frostDay(SITE, "lastFrost"), 105);
  assert.equal(frostDay(SITE, "lastFrost", { probabilityPct: 10 }), 124);
  assert.equal(anchorDay(SITE, { kind: "firstFrost" }), 301);
  assert.throws(() => frostDay(SITE, "firstFrost", { thresholdF: 28 }), /no firstFrost entry/);
});

test("soilTemp/gddAccum are gates in v1, not primary anchors", () => {
  assert.throws(
    () => anchorDay(SITE, { kind: "soilTemp", depthIn: 4, thresholdF: 60, direction: "rising" }),
    UnsupportedAnchorError
  );
  assert.throws(() => anchorDay(SITE, { kind: "gddAccum", baseF: 50, sum: 200 }), UnsupportedAnchorError);
});

test("photoperiod: Piedmont latitude crosses 10h, equator never does", () => {
  assert.ok(daylengthHours(SITE.lat, 172) > 14, "summer solstice long");
  assert.ok(daylengthHours(SITE.lat, 355) < 10.1, "winter solstice short");
  const shortening = photoperiodCrossing(SITE.lat, 10, "shortening");
  const lengthening = photoperiodCrossing(SITE.lat, 10, "lengthening");
  assert.ok(shortening > 300 && shortening < 345, `Persephone start ~mid-Nov, got ${shortening}`);
  assert.ok(lengthening > 5 && lengthening < 45, `Persephone end ~late Jan, got ${lengthening}`);
  assert.equal(photoperiodCrossing(0, 10, "shortening"), null);
  assert.equal(anchorDay(SITE, { kind: "photoperiod", hours: 10, direction: "shortening" }), shortening);
});

// --- anchored events + derived harvests -------------------------------------

test("spinach events: two seasons, derived harvests, cross-year overwinter", () => {
  const timing = PIEDMONT_NC.crops.find((c) => c.crop === "spinach").timing;
  assert.equal(timing.kind, "anchored");
  const windows = resolveAnchoredEvents(timing.events, SITE, CROP_CATALOG.spinach);

  const sows = windows.filter((w) => w.activity === "sowOutdoors");
  const harvests = windows.filter((w) => w.activity === "harvest");

  // Spring sow: lastFrost 105 + [-45, 0] → [60, 105]
  assert.ok(sows.some((w) => w.start === 60 && w.end === 105));
  // Spring harvest: [60+50, 105+60] = [110, 165]
  assert.ok(harvests.some((w) => w.start === 110 && w.end === 165));
  // Fall main sow: firstFrost 301 + [-56, -14] → [245, 287]; harvest [295, 347]
  assert.ok(harvests.some((w) => w.start === 295 && w.end === 347));
  // Overwinter sow crosses nothing yet, but its window sits at year's edge
  assert.ok(sows.some((w) => w.start === 301 && w.end === 315 && w.special));
});

test("derived harvest without the needed DTH range throws loudly", () => {
  const events = [
    { id: "p", activity: "sowOutdoors", anchor: { kind: "lastFrost" }, offsetDays: [0, 10] },
    { id: "h", activity: "harvest", fromEventId: "p", method: "transplant" },
  ];
  assert.throws(
    () => resolveAnchoredEvents(events, SITE, CROP_CATALOG.spinach), // spinach has no transplant DTH
    /no daysToMaturity\.transplant/
  );
});

// --- bucketing (render-time; year wrap happens here) -------------------------

test("cross-year window buckets into dec h2 AND jan h1", () => {
  const grid = bucketWindows([{ activity: "harvest", start: 351, end: 375 }]);
  assert.deepEqual(grid.dec.half2, ["h"]);
  assert.deepEqual(grid.jan.half1, ["h"]);
  assert.deepEqual(grid.jan.half2, []);
});

test("negative-start window (previous December) buckets correctly", () => {
  const grid = bucketWindows([{ activity: "sowIndoors", start: -10, end: 5 }]);
  assert.deepEqual(grid.dec.half2, ["si"]);
  assert.deepEqual(grid.jan.half1, ["si"]);
});

test("special windows add the legacy '*' code; slot boundaries respected", () => {
  const grid = bucketWindows([
    { activity: "sowOutdoors", start: 213, end: 227, special: true }, // Aug 1–15
  ]);
  assert.deepEqual(grid.aug.half1, ["s", "*"]);
  assert.deepEqual(grid.aug.half2, []);
  assert.deepEqual(grid.jul.half2, []);
});

test("verbatim timing passes through as an equal, independent copy", () => {
  const row = PIEDMONT_NC.crops.find((c) => c.crop === "tomatoes");
  const { grid, windows } = resolveCropTiming(row.timing, SITE, undefined);
  assert.deepEqual(grid, row.timing.grid);
  assert.notEqual(grid.apr.half1, row.timing.grid.apr.half1, "must be a copy");
  assert.equal(windows, undefined);
});

// --- footprints & precedence -------------------------------------------------

const BIG_BBOX = { kind: "bbox", minLat: 24, minLng: -125, maxLat: 49, maxLng: -66 };
const SMALL_POLY = {
  kind: "polygon",
  ring: [
    [-80, 35], [-78, 35], [-78, 36.5], [-80, 36.5],
  ],
};

test("footprint containment: bbox, polygon, counties throws", () => {
  assert.ok(footprintContains(BIG_BBOX, SITE.lat, SITE.lng));
  assert.ok(footprintContains(SMALL_POLY, SITE.lat, SITE.lng));
  assert.ok(!footprintContains(SMALL_POLY, 40, -100));
  assert.throws(() => footprintContains({ kind: "counties", fips: ["37135"] }, 35, -79));
});

function mkPack(id, footprint, crops) {
  return { schemaVersion: 1, id, name: id, footprint, sources: {}, crops };
}
const gridA = (() => { const g = emptyGrid(); g.mar.half1 = ["s"]; return g; })();
const gridB = (() => { const g = emptyGrid(); g.apr.half1 = ["s"]; return g; })();
const prov = (n) => ({ confidence: 3, sources: [], note: n });

test("precedence: polygon pack beats bbox pack for the same crop", () => {
  const big = mkPack("us", BIG_BBOX, [
    { crop: "x", timing: { kind: "verbatim", grid: gridA }, provenance: prov("big") },
  ]);
  const small = mkPack("local", SMALL_POLY, [
    { crop: "x", timing: { kind: "verbatim", grid: gridB }, provenance: prov("small") },
  ]);
  assert.ok(byPrecedence(small, big) < 0, "polygon sorts first");
  const [cal] = resolveAll(SITE, { catalog: {}, packs: [big, small] });
  assert.deepEqual(cal.grid, gridB);
  assert.equal(cal.provenance.note, "small");
});

test("field fall-through: prose-only local row inherits timing from below", () => {
  const big = mkPack("us", BIG_BBOX, [
    { crop: "x", timing: { kind: "verbatim", grid: gridA }, provenance: prov("big") },
  ]);
  const small = mkPack("local", SMALL_POLY, [
    { crop: "x", tips: "local tip only", provenance: prov("small") },
  ]);
  const [cal] = resolveAll(SITE, { catalog: {}, packs: [big, small] });
  assert.deepEqual(cal.grid, gridA, "timing falls through to the bbox pack");
  assert.equal(cal.provenance.note, "big", "provenance follows the timing");
});

test("excluded in the most specific pack hides the crop entirely", () => {
  const big = mkPack("us", BIG_BBOX, [
    { crop: "x", timing: { kind: "verbatim", grid: gridA }, provenance: prov("big") },
  ]);
  const small = mkPack("local", SMALL_POLY, [
    { crop: "x", excluded: true, provenance: prov("small") },
  ]);
  const cals = resolveAll(SITE, { catalog: {}, packs: [big, small] });
  assert.equal(cals.length, 0);
});

test("packs whose footprint misses the site are ignored", () => {
  const elsewhere = mkPack("elsewhere", { kind: "bbox", minLat: 40, minLng: -90, maxLat: 45, maxLng: -85 }, [
    { crop: "x", timing: { kind: "verbatim", grid: gridA }, provenance: prov("far") },
  ]);
  assert.equal(resolveAll(SITE, { catalog: {}, packs: [elsewhere] }).length, 0);
});

// --- end-to-end through the sample pack --------------------------------------

test("resolveAll over PIEDMONT_NC: tomatoes verbatim, spinach anchored with wrap", () => {
  const cals = resolveAll(SITE, { catalog: CROP_CATALOG, packs: [PIEDMONT_NC] });
  const tomatoes = cals.find((c) => c.crop === "tomatoes");
  const spinach = cals.find((c) => c.crop === "spinach");

  assert.deepEqual(tomatoes.grid, PIEDMONT_NC.crops[0].timing.grid);
  assert.equal(tomatoes.windows, undefined, "verbatim rows carry no day windows");

  assert.ok(spinach.windows.length > 0, "anchored rows expose day windows");
  assert.ok(spinach.grid.mar.half1.includes("s"), "spring sow");
  assert.ok(spinach.grid.nov.half1.includes("s"), "overwinter sow");
  assert.ok(spinach.grid.nov.half1.includes("*"), "overwinter flagged special");
  assert.ok(spinach.grid.dec.half2.includes("h"), "fall harvest tail");
  assert.ok(spinach.grid.jan.half1.includes("h"), "harvest wraps into the next year");
});
