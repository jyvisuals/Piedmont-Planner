// Catalog completeness + parse-sanity tests (node:test, no deps).
//
// The crop catalog must cover EXACTLY the plants in data.js's PLANTS array,
// keyed by the loader's slugify(name), with structured days-to-maturity that
// never invents numbers the legacy free text does not contain.
//
// Run: node --test schema/tests/catalog.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CROP_CATALOG } from "../crop-catalog.ts";
import { loadLegacyGlobals, slugify } from "../loader/load-legacy.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const { plants } = loadLegacyGlobals(ROOT);

/** slug → legacy plant record. */
const legacyBySlug = new Map(plants.map((p) => [slugify(p.name), p]));

test("catalog keys are exactly the slugified legacy plant names", () => {
  const legacySlugs = [...legacyBySlug.keys()].sort();
  const catalogKeys = Object.keys(CROP_CATALOG).sort();
  assert.deepEqual(catalogKeys, legacySlugs);
  // data.js has no slug collisions, so counts must match the PLANTS array too.
  assert.equal(catalogKeys.length, plants.length);
});

test("every entry's slug matches its key and displayName is the legacy name verbatim", () => {
  for (const [key, entry] of Object.entries(CROP_CATALOG)) {
    assert.equal(entry.slug, key, `slug mismatch for key "${key}"`);
    const legacy = legacyBySlug.get(key);
    assert.ok(legacy, `no legacy plant for key "${key}"`);
    assert.equal(entry.displayName, legacy.name, `displayName mismatch for "${key}"`);
  }
});

test("spacingIn carries the legacy spacing verbatim (omitted only when legacy is empty)", () => {
  for (const [key, entry] of Object.entries(CROP_CATALOG)) {
    const legacy = legacyBySlug.get(key);
    if (legacy.spacing) {
      assert.equal(entry.spacingIn, legacy.spacing, `spacingIn mismatch for "${key}"`);
    } else {
      assert.equal(entry.spacingIn, undefined, `spacingIn should be omitted for "${key}"`);
    }
  }
});

test("all days-to-maturity ranges are well-formed", () => {
  for (const [key, entry] of Object.entries(CROP_CATALOG)) {
    for (const method of ["direct", "transplant"]) {
      const range = entry.daysToMaturity[method];
      if (range === undefined) continue;
      assert.equal(range.length, 2, `${key}.${method} must be a 2-tuple`);
      const [min, max] = range;
      assert.ok(Number.isInteger(min) && Number.isInteger(max), `${key}.${method} not integers`);
      assert.ok(min > 0, `${key}.${method} min must be positive (got ${min})`);
      assert.ok(min <= max, `${key}.${method} inverted: [${min}, ${max}]`);
      assert.ok(max < 400, `${key}.${method} max out of sane bounds (got ${max})`);
    }
  }
});

test("spot-check: tomatoes parsed from 'T = 75-85, S = 125-135**'", () => {
  const t = CROP_CATALOG.tomatoes.daysToMaturity;
  assert.deepEqual([...t.transplant], [75, 85]);
  assert.deepEqual([...t.direct], [125, 135]);
});

test("spot-check: spinach direct = [50, 60] with no transplant range", () => {
  const s = CROP_CATALOG.spinach.daysToMaturity;
  assert.deepEqual([...s.direct], [50, 60]);
  assert.equal(s.transplant, undefined);
});

test("spot-check: leaf lettuce parsed from 'S = 40-50, T = 15-25' (both methods)", () => {
  const l = CROP_CATALOG["lettuce-leaf"].daysToMaturity;
  assert.deepEqual([...l.direct], [40, 50]);
  assert.deepEqual([...l.transplant], [15, 25]);
});

test("unparseable legacy DTH carries a note and no fabricated ranges", () => {
  // The entries whose legacy daysToHarvest yields no usable range: either the
  // string is empty, or it is prose ("Perennial", "Perennial; 2-3 years to
  // full harvest") whose numbers are not days-to-harvest.
  const expectedNoteOnly = new Set([
    "strawberries-bare-root", "potatoes-irish", "yarrow", "sage", "marigolds",
    "echinacea", "borage", "ginger", "zinnias", "nasturtium", // empty in data.js
    "asparagus", "blueberries", "blackberries", "rosemary", "thyme", "oregano",
    "mint", // perennial prose in data.js
  ]);

  const actualNoteOnly = new Set();
  for (const [key, entry] of Object.entries(CROP_CATALOG)) {
    const legacy = legacyBySlug.get(key);
    const raw = legacy.daysToHarvest || "";
    const { direct, transplant, note } = entry.daysToMaturity;
    const hasRange = direct !== undefined || transplant !== undefined;

    if (!hasRange) {
      actualNoteOnly.add(key);
      // Must say why via a note, and non-empty raw text must survive in it.
      assert.ok(note, `"${key}" has no DTH ranges and no note`);
      if (raw) {
        assert.ok(note.includes(raw), `"${key}" note should carry the raw string "${raw}"`);
      }
    } else {
      // Never invent: every range bound must literally appear in the raw text.
      for (const range of [direct, transplant]) {
        if (!range) continue;
        for (const bound of range) {
          assert.ok(
            raw.includes(String(bound)),
            `"${key}" bound ${bound} does not appear in legacy DTH "${raw}"`
          );
        }
      }
    }
  }
  assert.deepEqual([...actualNoteOnly].sort(), [...expectedNoteOnly].sort());
});

test("perennial free-text DTH entries carry the raw string as the note", () => {
  assert.equal(
    CROP_CATALOG.asparagus.daysToMaturity.note,
    "Perennial; 2-3 years to full harvest"
  );
  for (const key of ["blueberries", "blackberries", "rosemary", "thyme", "oregano", "mint"]) {
    assert.equal(CROP_CATALOG[key].daysToMaturity.note, "Perennial", key);
  }
});

test("minFrostFreeDays never appears on perennial / very-hardy / hardy entries", () => {
  for (const [key, entry] of Object.entries(CROP_CATALOG)) {
    if (entry.hardiness === "tender" || entry.hardiness === "half-hardy") continue;
    assert.equal(
      entry.minFrostFreeDays,
      undefined,
      `"${key}" (${entry.hardiness}) should not carry minFrostFreeDays`
    );
  }
});
