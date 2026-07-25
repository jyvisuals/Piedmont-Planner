// The regression gate: "Carrboro must not move."
// The loader-derived Piedmont pack, resolved at a Carrboro site through the
// real resolver, must reproduce every data.js grid EXACTLY. Verbatim carriage
// makes this true by construction (D2) — this test asserts the construction.

import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadLegacyGlobals, loadLegacyPiedmontPack, slugify } from "../loader/load-legacy.mjs";
import { resolveAll } from "../engine/resolve.ts";

const rootDir = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

const CARRBORO_SITE = {
  lat: 35.91,
  lng: -79.08,
  zone: "8a",
  frostFreeDays: 196,
  frost: {
    lastFrost: { "32/50": 105 }, // ~Apr 15
    firstFrost: { "32/50": 301 }, // ~Oct 28
    station: { id: "fixture", distanceKm: 0 },
  },
  datasetVersions: { ncei: "1991-2020" },
};

test("loader emits one verbatim row per data.js plant, fully attributed", () => {
  const { plants } = loadLegacyGlobals(rootDir);
  const pack = loadLegacyPiedmontPack(rootDir);

  assert.equal(pack.schemaVersion, 1);
  assert.equal(pack.crops.length, plants.length);

  for (const row of pack.crops) {
    assert.equal(row.timing.kind, "verbatim");
    assert.ok(Number.isInteger(row.provenance.confidence));
    assert.ok(row.provenance.confidence >= 0 && row.provenance.confidence <= 5);
    assert.ok(Array.isArray(row.provenance.sources) && row.provenance.sources.length > 0);
    for (const id of row.provenance.sources) {
      assert.ok(pack.sources[id], `row ${row.crop} cites unknown source "${id}"`);
    }
  }
});

test("golden: resolver output at Carrboro equals data.js grid for every crop", () => {
  const { plants } = loadLegacyGlobals(rootDir);
  const pack = loadLegacyPiedmontPack(rootDir);

  const calendars = resolveAll(CARRBORO_SITE, { catalog: {}, packs: [pack] });
  const bySlug = new Map(calendars.map((c) => [c.crop, c]));

  assert.equal(calendars.length, plants.length, "every plant must resolve");

  for (const plant of plants) {
    const cal = bySlug.get(slugify(plant.name));
    assert.ok(cal, `missing calendar for ${plant.name}`);
    assert.deepEqual(
      cal.grid,
      plant.months,
      `grid moved for ${plant.name} — curated data must pass through verbatim`
    );
    assert.equal(cal.origin, "curated");
    assert.ok(cal.provenance, `provenance lost for ${plant.name}`);
  }
});

test("regional content is carried, not orphaned (transition-cost ledger item 1)", () => {
  const pack = loadLegacyPiedmontPack(rootDir);

  // Honesty-by-distance: the validation point rides along with the pack.
  assert.equal(pack.referencePoint.label, "Carrboro, NC");

  // The chore calendar: all 12 months, both halves, non-empty prose.
  const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  assert.deepEqual(Object.keys(pack.regional.tasks).sort(), [...months].sort());
  for (const m of months) {
    assert.ok(pack.regional.tasks[m].half1.length > 0, `${m}.half1 empty`);
    assert.ok(pack.regional.tasks[m].half2.length > 0, `${m}.half2 empty`);
  }

  // Greenhouse subsystem: policy prose + per-crop maps re-keyed to slugs.
  assert.ok(pack.regional.greenhouse.rules.mode, "greenhouse rules carried");
  assert.equal(pack.regional.greenhouse.cropConfidence.spinach.level, "high");
  assert.equal(pack.regional.greenhouse.cropRuleCategory.spinach, "allow_sg_shoulder");
  for (const slug of Object.keys(pack.regional.greenhouse.cropConfidence)) {
    assert.ok(
      pack.crops.some((c) => c.crop === slug),
      `greenhouse confidence keyed to unknown crop slug "${slug}"`
    );
  }

  // Rubric text travels with the scores it explains.
  assert.equal(Object.keys(pack.regional.confidenceRubric).length, 6);
});

test("golden: resolver returns copies — mutating output cannot corrupt the pack", () => {
  const pack = loadLegacyPiedmontPack(rootDir);
  const [first] = resolveAll(CARRBORO_SITE, { catalog: {}, packs: [pack] });
  first.grid.jan.half1.push("h");
  const [again] = resolveAll(CARRBORO_SITE, { catalog: {}, packs: [pack] });
  assert.ok(!again.grid.jan.half1.includes("h") || pack.crops[0].timing.grid.jan.half1.includes("h"));
  assert.deepEqual(again.grid, pack.crops[0].timing.grid);
});
