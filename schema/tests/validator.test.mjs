// Runtime pack validator suite.
// Proves three things:
//   1. Real packs pass — the hand-written sample AND the full loader-generated
//      Piedmont pack (~77 crops), including after a JSON round-trip (the shape
//      contributor packs actually arrive in).
//   2. Broken packs fail with the RIGHT error — each mutation below breaks
//      exactly one thing in a deep clone and asserts the reported error carries
//      the matching locator/reason, with no noise from the untouched parts.
//   3. Garbage input never throws.

import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateRegionPack } from "../validate-pack.ts";
import { PIEDMONT_NC } from "../packs/piedmont-nc.ts";
import { loadLegacyPiedmontPack } from "../loader/load-legacy.mjs";

const rootDir = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

function clone(pack) {
  return structuredClone(pack);
}

// ---------------------------------------------------------------------------
// Valid packs validate.
// ---------------------------------------------------------------------------

test("hand-written sample pack validates", () => {
  const result = validateRegionPack(PIEDMONT_NC);
  assert.deepEqual(result, { ok: true, pack: PIEDMONT_NC });
});

test("full loader-generated pack validates (real-world scale)", () => {
  const pack = loadLegacyPiedmontPack(rootDir);
  assert.ok(pack.crops.length >= 70, `expected ~77 crops, got ${pack.crops.length}`);
  const result = validateRegionPack(pack);
  assert.deepEqual(result.errors ?? [], [], "loader pack should produce zero errors");
  assert.equal(result.ok, true);
});

test("JSON round-trip still validates (contributor packs arrive as JSON)", () => {
  for (const pack of [PIEDMONT_NC, loadLegacyPiedmontPack(rootDir)]) {
    const roundTripped = JSON.parse(JSON.stringify(pack));
    const result = validateRegionPack(roundTripped);
    assert.deepEqual(result.errors ?? [], []);
    assert.equal(result.ok, true);
  }
});

// ---------------------------------------------------------------------------
// Targeted invalid mutations. Each case deep-clones the sample, breaks ONE
// thing, and asserts: ok:false, the expected error is reported, and the total
// error count matches — i.e. the untouched valid parts contribute no errors.
//
// Sample-pack layout the indices below rely on:
//   crops[0] = tomatoes (verbatim grid), crops[1] = spinach (anchored events);
//   spinach events: [0]=s-sg-spring [1]=s-sow-spring [2]=s-h-spring(harvest)
//   [3..6]=fall sows  [7]=s-h-fall(harvest)  [8]=s-h-overwinter(harvest).
// ---------------------------------------------------------------------------

const MUTATIONS = [
  {
    name: "wrong schemaVersion",
    mutate: (p) => { p.schemaVersion = 2; },
    expect: /^schemaVersion: expected 1, got number 2/,
  },
  {
    name: "missing month in a verbatim grid",
    mutate: (p) => { delete p.crops[0].timing.grid.jul; },
    expect: /^crops\[0\]\.timing\.grid: missing month "jul"/,
  },
  {
    name: "illegal code in a half-month slot",
    mutate: (p) => { p.crops[0].timing.grid.mar.half1 = ["si", "zz"]; },
    expect: /^crops\[0\]\.timing\.grid\.mar\.half1\[1\]: illegal code "zz"/,
  },
  {
    name: "duplicate code within one slot",
    mutate: (p) => { p.crops[0].timing.grid.apr.half2 = ["t", "t"]; },
    expect: /^crops\[0\]\.timing\.grid\.apr\.half2\[1\]: duplicate code "t"/,
  },
  {
    name: "inverted offsetDays",
    mutate: (p) => { p.crops[1].timing.events[1].offsetDays = [10, -5]; },
    expect: /^crops\[1\]\.timing\.events\[1\]\.offsetDays: \[10, -5\] inverted \(earliest must be ≤ latest\)/,
  },
  {
    name: "non-integer offsetDays bound",
    mutate: (p) => { p.crops[1].timing.events[0].offsetDays = [-70.5, -49]; },
    expect: /^crops\[1\]\.timing\.events\[0\]\.offsetDays\[0\]: expected a finite integer/,
  },
  {
    name: "unknown anchor kind",
    mutate: (p) => { p.crops[1].timing.events[0].anchor = { kind: "moonPhase" }; },
    expect: /^crops\[1\]\.timing\.events\[0\]\.anchor\.kind: unknown anchor kind "moonPhase"/,
  },
  {
    name: "illegal frost threshold in an anchor ref",
    mutate: (p) => { p.crops[1].timing.events[0].anchor = { kind: "lastFrost", ref: { thresholdF: 33 } }; },
    expect: /^crops\[1\]\.timing\.events\[0\]\.anchor\.ref\.thresholdF: illegal frost threshold number 33/,
  },
  {
    name: "dangling fromEventId",
    mutate: (p) => { p.crops[1].timing.events[2].fromEventId = "no-such-event"; },
    expect: /^crops\[1\]\.timing\.events\[2\]\.fromEventId: references "no-such-event", which matches no event id/,
  },
  {
    name: "harvest referencing another harvest",
    mutate: (p) => { p.crops[1].timing.events[8].fromEventId = "s-h-fall"; },
    expect: /^crops\[1\]\.timing\.events\[8\]\.fromEventId: references "s-h-fall", which is itself a harvest/,
  },
  {
    name: "illegal harvest method",
    mutate: (p) => { p.crops[1].timing.events[2].method = "broadcast"; },
    expect: /^crops\[1\]\.timing\.events\[2\]\.method: expected one of "direct", "transplant"/,
  },
  {
    name: "confidence out of range",
    mutate: (p) => { p.crops[1].provenance.confidence = 7; },
    expect: /^crops\[1\]\.provenance\.confidence: expected an integer 0-5, got number 7/,
  },
  {
    name: "provenance citing an unknown source id",
    mutate: (p) => { p.crops[0].provenance.sources.push("bogus-src"); },
    expect: /^crops\[0\]\.provenance\.sources\[3\]: cites unknown source id "bogus-src"/,
  },
  {
    name: "excluded row that also has timing",
    mutate: (p) => { p.crops[0].excluded = true; },
    expect: /^crops\[0\]: excluded row must not carry "timing"/,
  },
  {
    name: "polygon with 2 points",
    mutate: (p) => { p.footprint = { kind: "polygon", ring: [[-79.1, 35.9], [-78.6, 36.2]] }; },
    expect: /^footprint\.ring: polygon ring has 2 point\(s\); needs at least 3/,
  },
  {
    name: "bbox with inverted latitudes",
    mutate: (p) => { p.footprint = { kind: "bbox", minLat: 40, minLng: -81.6, maxLat: 33.6, maxLng: -78.6 }; },
    expect: /^footprint: bbox inverted: minLat 40 > maxLat 33\.6/,
  },
  {
    name: "counties fips with non-digit entry",
    mutate: (p) => { p.footprint = { kind: "counties", fips: ["37135", "37-63"] }; },
    expect: /^footprint\.fips\[1\]: expected a non-empty string of digits, got "37-63"/,
  },
  {
    name: "duplicate crop slug",
    mutate: (p) => { p.crops.push(structuredClone(p.crops[0])); },
    expect: /^crops\[2\]\.crop: duplicate crop slug "tomatoes" \(first used at crops\[0\]\)/,
  },
  {
    name: "non-slug crop id",
    mutate: (p) => { p.crops[0].crop = "Tomatoes!"; },
    expect: /^crops\[0\]\.crop: "Tomatoes!" is not slug-shaped/,
  },
  {
    name: "non-http source url",
    mutate: (p) => { p.sources.nc_state_calendar.url = "ftp://example.org/cal"; },
    expect: /^sources\.nc_state_calendar\.url: expected an http\(s\) URL/,
  },
  {
    name: "empty pack id",
    mutate: (p) => { p.id = "   "; },
    expect: /^id: expected a non-empty string/,
  },
  {
    name: "duplicate event id (cascades to the harvest that lost its target)",
    mutate: (p) => { p.crops[1].timing.events[4].id = "s-sow-spring"; },
    expect: /^crops\[1\]\.timing\.events\[4\]\.id: duplicate event id "s-sow-spring" \(first used at crops\[1\]\.timing\.events\[1\]\)/,
    // Renaming s-sow-fall-main also dangles s-h-fall's fromEventId — both real.
    alsoAllowed: /^crops\[1\]\.timing\.events\[7\]\.fromEventId: references "s-sow-fall-main"/,
  },
];

for (const { name, mutate, expect, alsoAllowed } of MUTATIONS) {
  test(`rejects: ${name}`, () => {
    const broken = clone(PIEDMONT_NC);
    mutate(broken);
    const result = validateRegionPack(broken);
    assert.equal(result.ok, false, `expected ok:false for "${name}"`);
    assert.ok(
      result.errors.some((e) => expect.test(e)),
      `expected an error matching ${expect} in:\n  ${result.errors.join("\n  ")}`
    );
    // Exactly the expected failure(s) — untouched valid parts stay silent.
    const stray = result.errors.filter(
      (e) => !expect.test(e) && !(alsoAllowed && alsoAllowed.test(e))
    );
    assert.deepEqual(stray, [], `unexpected extra errors for "${name}"`);
  });
}

// ---------------------------------------------------------------------------
// Garbage in, errors out — never a throw.
// ---------------------------------------------------------------------------

test("non-object inputs fail gracefully without throwing", () => {
  for (const bad of [null, undefined, 42, "pack", true, [], [PIEDMONT_NC]]) {
    let result;
    assert.doesNotThrow(() => { result = validateRegionPack(bad); });
    assert.equal(result.ok, false);
    assert.ok(result.errors.length >= 1);
    assert.match(result.errors[0], /^\$: expected a region-pack object/);
  }
});

test("object with everything missing reports each required field", () => {
  const result = validateRegionPack({});
  assert.equal(result.ok, false);
  for (const re of [/^schemaVersion:/, /^id:/, /^name:/, /^footprint:/, /^sources:/, /^crops:/]) {
    assert.ok(result.errors.some((e) => re.test(e)), `missing error matching ${re}`);
  }
});
