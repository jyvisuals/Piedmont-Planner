// Computed base-layer tests (node:test — no dependencies).
// Covers computedEvents per hardiness class, the N=2 second-region proof
// (computed-only Vermont vs curated+computed Carrboro), the crop-applicability
// filter, curated-over-computed precedence, exclusion blocking fall-through,
// and backward-counted fall windows.
//
// Catalog fixtures are INLINE on purpose — schema/crop-catalog.ts is being
// rewritten concurrently and must not be imported here.

import { test } from "node:test";
import assert from "node:assert/strict";

import { computedEvents } from "../engine/computed-rules.ts";
import { resolveAll } from "../engine/resolve.ts";
import { PIEDMONT_NC } from "../packs/piedmont-nc.ts";

// --- site fixtures -----------------------------------------------------------

const CARRBORO = {
  lat: 35.91,
  lng: -79.08,
  zone: "8a",
  frostFreeDays: 196,
  frost: {
    lastFrost: { "32/50": 105 }, // ~Apr 15
    firstFrost: { "32/50": 301 }, // ~Oct 28
    station: { id: "fixture-carrboro", distanceKm: 0 },
  },
  datasetVersions: { ncei: "1991-2020" },
};

// Second region, OUTSIDE the Piedmont bbox: Burlington, VT-ish.
const VERMONT = {
  lat: 44.5,
  lng: -73.2,
  zone: "5a",
  frostFreeDays: 139,
  frost: {
    lastFrost: { "32/50": 135 }, // ~May 15
    firstFrost: { "32/50": 274 }, // ~Oct 1
    station: { id: "fixture-vermont", distanceKm: 0 },
  },
  datasetVersions: { ncei: "1991-2020" },
};

// --- inline catalog fixtures -------------------------------------------------

const TENDER_BOTH = {
  slug: "tender-x",
  displayName: "Tender Fixture",
  category: "vegetable",
  hardiness: "tender",
  daysToMaturity: { transplant: [70, 80], direct: [120, 130] },
  minFrostFreeDays: 160,
};

const HALF_HARDY_BOTH = {
  slug: "half-hardy-x",
  displayName: "Half-hardy Fixture",
  category: "vegetable",
  hardiness: "half-hardy",
  daysToMaturity: { direct: [40, 50], transplant: [15, 25] },
  minFrostFreeDays: 45,
};

const HARDY_DIRECT = {
  slug: "hardy-x",
  displayName: "Hardy Fixture",
  category: "vegetable",
  hardiness: "hardy",
  daysToMaturity: { direct: [50, 60] },
  minFrostFreeDays: 60,
};

const PERENNIAL = {
  slug: "perennial-x",
  displayName: "Perennial Fixture",
  category: "vegetable",
  hardiness: "perennial",
  daysToMaturity: { direct: [365, 400] },
};

const NO_DTH = {
  slug: "no-dth-x",
  displayName: "No-DTH Fixture",
  category: "vegetable",
  hardiness: "very-hardy",
  daysToMaturity: { note: "overwinters; no usable range" },
};

const OVERWINTER = {
  slug: "overwinter-x", // garlic-like: fall-planted, overwintered
  displayName: "Overwinter Fixture",
  category: "vegetable",
  hardiness: "very-hardy",
  overwinter: true,
  daysToMaturity: { direct: [180, 210] },
};

const SHARED_CATALOG = {
  "tender-x": TENDER_BOTH,
  "half-hardy-x": HALF_HARDY_BOTH,
  "hardy-x": HARDY_DIRECT,
  "perennial-x": PERENNIAL,
  "no-dth-x": NO_DTH,
};

function findEvent(events, id) {
  const ev = events.find((e) => e.id === id);
  assert.ok(ev, `missing event ${id}`);
  return ev;
}

// --- computedEvents shape per hardiness class --------------------------------

test("tender with both DTH: indoor+transplant run AND warm direct run", () => {
  const events = computedEvents(TENDER_BOTH);
  assert.deepEqual(findEvent(events, "computed-si-spring").offsetDays, [-42, -28]);
  assert.deepEqual(findEvent(events, "computed-t-spring").offsetDays, [7, 21]);
  assert.deepEqual(findEvent(events, "computed-s-spring").offsetDays, [7, 28]);
  const ht = findEvent(events, "computed-h-spring-transplant");
  assert.equal(ht.method, "transplant");
  assert.equal(ht.fromEventId, "computed-t-spring");
  const hd = findEvent(events, "computed-h-spring-direct");
  assert.equal(hd.method, "direct");
  // Tender crops get NO computed fall window — frost kills them.
  assert.ok(!events.some((e) => e.id === "computed-s-fall"));
  for (const e of events) {
    if (e.activity !== "harvest") assert.equal(e.anchor.kind, "lastFrost");
  }
});

test("half-hardy with both DTH: earlier lead, straddling set-out, fall window", () => {
  const events = computedEvents(HALF_HARDY_BOTH);
  assert.deepEqual(findEvent(events, "computed-si-spring").offsetDays, [-49, -35]);
  assert.deepEqual(findEvent(events, "computed-t-spring").offsetDays, [-7, 14]);
  assert.deepEqual(findEvent(events, "computed-s-spring").offsetDays, [-14, 14]);
  // Fall window sized by direct DTH [40, 50]. Half-hardy crops are ended by
  // frost, so the LATE edge reserves maxDTH: [-(50+14), -50] — this guarantees
  // the derived harvest (latest sow + maxDTH) lands exactly at frost, never
  // past it (PR #3 review finding).
  const fall = findEvent(events, "computed-s-fall");
  assert.equal(fall.anchor.kind, "firstFrost");
  assert.deepEqual(fall.offsetDays, [-64, -50]);
  assert.equal(findEvent(events, "computed-h-fall-direct").method, "direct");
  // Regression: latest fall sowing + max maturity must not overshoot frost.
  const [, lateEdge] = fall.offsetDays;
  assert.ok(lateEdge + 50 <= 0, "half-hardy fall harvest must end by firstFrost");
});

test("hardy with direct DTH: early spring sow + backward-counted fall window", () => {
  const events = computedEvents(HARDY_DIRECT);
  const spring = findEvent(events, "computed-s-spring");
  assert.equal(spring.anchor.kind, "lastFrost");
  assert.deepEqual(spring.offsetDays, [-45, -15]);
  // Fall window sized by direct DTH [50, 60]: [-(60+14), -50].
  assert.deepEqual(findEvent(events, "computed-s-fall").offsetDays, [-74, -50]);
  // No invented indoor schedule when the crop direct-sows.
  assert.ok(!events.some((e) => e.id === "computed-si-spring"));
});

test("hardy with transplant-only DTH: fallback indoor run, frost-tolerant set-out", () => {
  const events = computedEvents({
    slug: "hardy-tp-x",
    displayName: "Hardy Transplant Fixture",
    category: "vegetable",
    hardiness: "very-hardy",
    daysToMaturity: { transplant: [90, 110] },
  });
  assert.deepEqual(findEvent(events, "computed-si-spring").offsetDays, [-63, -49]);
  assert.deepEqual(findEvent(events, "computed-t-spring").offsetDays, [-21, 0]);
  assert.equal(findEvent(events, "computed-h-spring-transplant").method, "transplant");
  assert.ok(!events.some((e) => e.id === "computed-s-fall"), "no direct DTH → no fall sizing");
});

test("perennials and no-DTH entries return null — the layer stays honest", () => {
  assert.equal(computedEvents(PERENNIAL), null);
  assert.equal(computedEvents(NO_DTH), null);
  // Malformed range is not "usable".
  assert.equal(
    computedEvents({
      slug: "bad-x",
      displayName: "Bad Range",
      category: "vegetable",
      hardiness: "hardy",
      daysToMaturity: { direct: [60, 50] },
    }),
    null
  );
});

// --- N=2 proof: second region resolves computed-only, and differently --------

test("N=2: Vermont site with the Piedmont pack resolves ALL crops computed", () => {
  const cals = resolveAll(VERMONT, { catalog: SHARED_CATALOG, packs: [PIEDMONT_NC] });

  // tender-x filtered (needs 160 > 139 frost-free days); perennial-x and
  // no-dth-x return null — only the two cool-season fixtures survive.
  assert.deepEqual(cals.map((c) => c.crop).sort(), ["half-hardy-x", "hardy-x"]);
  for (const cal of cals) {
    assert.equal(cal.origin, "computed", `${cal.crop} must be computed outside the pack`);
    assert.equal(cal.provenance, undefined, `${cal.crop} must carry no provenance (D8)`);
    assert.ok(Array.isArray(cal.windows) && cal.windows.length > 0, "day windows exposed");
  }
});

test("N=2: the same catalog genuinely resolves to different windows per region", () => {
  const [vt] = resolveAll(VERMONT, { catalog: { "hardy-x": HARDY_DIRECT }, packs: [] });
  const [nc] = resolveAll(CARRBORO, { catalog: { "hardy-x": HARDY_DIRECT }, packs: [] });

  // Spring sow = lastFrost + [-45, -15]: Carrboro [60, 90], Vermont [90, 120].
  const springOf = (cal) =>
    cal.windows.filter((w) => w.activity === "sowOutdoors").sort((a, b) => a.start - b.start)[0];
  assert.deepEqual([springOf(nc).start, springOf(nc).end], [60, 90]);
  assert.deepEqual([springOf(vt).start, springOf(vt).end], [90, 120]);

  // Concrete slot difference: Carrboro's sow starts Mar 1 (mar half1); Vermont's
  // starts Mar 31 (mar half2) — early March shows "s" only in the South.
  assert.ok(nc.grid.mar.half1.includes("s"), "Carrboro sows in early March");
  assert.ok(!vt.grid.mar.half1.includes("s"), "Vermont must NOT sow in early March");
  assert.ok(vt.grid.mar.half2.includes("s"), "Vermont's window opens late March");
});

// --- crop-applicability filter ------------------------------------------------

test("applicability filter: 160-day tender crop present at Carrboro, absent in Vermont", () => {
  const input = { catalog: { "tender-x": TENDER_BOTH }, packs: [] };
  const nc = resolveAll(CARRBORO, input);
  const vt = resolveAll(VERMONT, input);
  assert.ok(nc.some((c) => c.crop === "tender-x"), "196 frost-free days fits 160");
  assert.ok(!vt.some((c) => c.crop === "tender-x"), "139 frost-free days cannot fit 160");
});

// --- precedence: curated stays curated; excluded never falls through ----------

test("precedence: pack timing stays curated while catalog-only crops go computed", () => {
  // Inline stand-ins for the two crops the Piedmont pack curates; the spinach
  // entry supplies the direct DTH its anchored harvests derive from.
  const catalog = {
    tomatoes: {
      slug: "tomatoes",
      displayName: "Tomatoes",
      category: "vegetable",
      hardiness: "tender",
      daysToMaturity: { transplant: [75, 85], direct: [125, 135] },
      minFrostFreeDays: 90,
    },
    spinach: {
      slug: "spinach",
      displayName: "Spinach",
      category: "vegetable",
      hardiness: "very-hardy",
      daysToMaturity: { direct: [50, 60] },
      minFrostFreeDays: 55,
    },
    "hardy-x": HARDY_DIRECT,
  };
  const cals = resolveAll(CARRBORO, { catalog, packs: [PIEDMONT_NC] });

  const tomatoes = cals.find((c) => c.crop === "tomatoes");
  assert.equal(tomatoes.origin, "curated");
  assert.ok(tomatoes.provenance, "curated rows keep their provenance");
  assert.equal(cals.filter((c) => c.crop === "tomatoes").length, 1, "no computed duplicate");

  const spinachRows = cals.filter((c) => c.crop === "spinach");
  assert.equal(spinachRows.length, 1);
  assert.equal(spinachRows[0].origin, "curated");

  const hardy = cals.find((c) => c.crop === "hardy-x");
  assert.equal(hardy.origin, "computed");
  assert.equal(hardy.provenance, undefined);
});

test("an excluded pack row yields NO calendar at all — not a computed fallback", () => {
  const exclusionPack = {
    schemaVersion: 1,
    id: "exclusion-fixture",
    name: "Exclusion Fixture",
    footprint: { kind: "bbox", minLat: 33.6, minLng: -81.6, maxLat: 36.6, maxLng: -78.6 },
    sources: {},
    crops: [
      {
        crop: "hardy-x",
        excluded: true,
        provenance: { confidence: 4, sources: [], note: "does not suit this region" },
      },
    ],
  };
  const cals = resolveAll(CARRBORO, {
    catalog: { "hardy-x": HARDY_DIRECT, "half-hardy-x": HALF_HARDY_BOTH },
    packs: [exclusionPack],
  });
  assert.ok(!cals.some((c) => c.crop === "hardy-x"), "excluded crop must vanish entirely");
  assert.ok(cals.some((c) => c.crop === "half-hardy-x"), "other catalog crops still compute");
});

// --- fall windows count backward from firstFrost ------------------------------

test("fall sow windows sit earlier where firstFrost is earlier (Vermont < Carrboro)", () => {
  const [vt] = resolveAll(VERMONT, { catalog: { "hardy-x": HARDY_DIRECT }, packs: [] });
  const [nc] = resolveAll(CARRBORO, { catalog: { "hardy-x": HARDY_DIRECT }, packs: [] });

  const fallOf = (cal) =>
    cal.windows.filter((w) => w.activity === "sowOutdoors").sort((a, b) => b.start - a.start)[0];

  // firstFrost + [-(60+14), -50]: Carrboro [227, 251]; Vermont [200, 224].
  assert.deepEqual([fallOf(nc).start, fallOf(nc).end], [227, 251]);
  assert.deepEqual([fallOf(vt).start, fallOf(vt).end], [200, 224]);
  assert.ok(fallOf(vt).start < fallOf(nc).start, "earlier firstFrost → earlier fall window");
  assert.ok(fallOf(vt).end < fallOf(nc).end);
});

test("overwinter crops are fall-planted around firstFrost, not spring (Path A1 garlic fix)", () => {
  const events = computedEvents(OVERWINTER);
  // A single fall planting anchored to firstFrost — no spring sow window.
  const set = findEvent(events, "computed-overwinter-set");
  assert.equal(set.activity, "plantSet");
  assert.equal(set.anchor.kind, "firstFrost");
  assert.deepEqual(set.offsetDays, [-45, 14]);
  assert.ok(!events.some((e) => e.id.includes("spring")), "no spring window for an overwinter crop");
  assert.equal(findEvent(events, "computed-h-overwinter").method, "direct");
});
