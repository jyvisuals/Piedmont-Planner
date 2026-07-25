// Legacy loader: mechanically translates data.js into Piedmont pack #1 with
// VERBATIM timing (D2/D5). No interpretation happens here — every grid is
// carried byte-for-byte, provenance comes from the existing review metadata,
// and the golden test asserts the round-trip is exact.
//
// data.js stays the single source of truth until the app itself switches to
// consuming packs; this loader is how the pack is derived from it, on demand.
//
// Usage:
//   import { loadLegacyPiedmontPack } from "./load-legacy.mjs";
//   node schema/loader/load-legacy.mjs   # prints the generated pack as JSON

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const EXPOSED = [
  "PLANTS",
  "PLANT_GUIDE",
  "PLANT_REVIEW_NOTES",
  "PLANT_REVIEW_CONFIDENCE_SCORES",
  "REVIEW_SOURCE_LIBRARY",
  "TASKS",
  "GREENHOUSE_RULES",
  "PLANT_GREENHOUSE_CONFIDENCE",
  "PLANT_GREENHOUSE_RULE_CATEGORY",
  "PLANT_REVIEW_CONFIDENCE_RUBRIC",
];

/** Load data.js in a sandbox and pull out the globals + evidence function. */
export function loadLegacyGlobals(rootDir) {
  const dataSource = fs.readFileSync(path.join(rootDir, "data.js"), "utf8");
  const expose = EXPOSED.map(
    (name) => `globalThis.__${name} = typeof ${name} === "undefined" ? null : ${name};`
  ).join("\n");
  const source = `${dataSource}\n${expose}\nglobalThis.__evidence = typeof getPlantReviewEvidenceSources === "undefined" ? null : getPlantReviewEvidenceSources;`;
  const context = vm.createContext({ globalThis: {} });
  new vm.Script(source, { filename: "data.js" }).runInContext(context);
  const g = context.globalThis;
  for (const name of EXPOSED) {
    if (!g[`__${name}`]) throw new Error(`data.js did not define ${name}`);
  }
  if (!g.__evidence) throw new Error("data.js did not define getPlantReviewEvidenceSources");
  // structuredClone pulls the data out of the vm realm — otherwise every object
  // carries the sandbox's prototypes and fails deepStrictEqual downstream.
  return {
    plants: structuredClone(g.__PLANTS),
    guide: structuredClone(g.__PLANT_GUIDE),
    reviewNotes: structuredClone(g.__PLANT_REVIEW_NOTES),
    confidenceScores: structuredClone(g.__PLANT_REVIEW_CONFIDENCE_SCORES),
    sourceLibrary: structuredClone(g.__REVIEW_SOURCE_LIBRARY),
    tasks: structuredClone(g.__TASKS),
    greenhouseRules: structuredClone(g.__GREENHOUSE_RULES),
    greenhouseConfidence: structuredClone(g.__PLANT_GREENHOUSE_CONFIDENCE),
    greenhouseRuleCategory: structuredClone(g.__PLANT_GREENHOUSE_RULE_CATEGORY),
    confidenceRubric: structuredClone(g.__PLANT_REVIEW_CONFIDENCE_RUBRIC),
    evidenceFor: g.__evidence,
  };
}

/** Deterministic slug from a legacy display name: "Lettuce, Head" → "lettuce-head". */
export function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Build the full verbatim Piedmont pack (a RegionPack per schema/types.ts). */
export function loadLegacyPiedmontPack(rootDir) {
  const {
    plants,
    guide,
    reviewNotes,
    confidenceScores,
    sourceLibrary,
    tasks,
    greenhouseRules,
    greenhouseConfidence,
    greenhouseRuleCategory,
    confidenceRubric,
    evidenceFor,
  } = loadLegacyGlobals(rootDir);

  const seen = new Map();
  const crops = plants.map((plant) => {
    const slug = slugify(plant.name);
    if (seen.has(slug)) {
      throw new Error(`slug collision: "${plant.name}" and "${seen.get(slug)}" → ${slug}`);
    }
    seen.set(slug, plant.name);

    const evidence = evidenceFor(plant.name) || [];
    const note = reviewNotes[plant.name];
    const g = guide[plant.name] || {};
    const confidence = Object.prototype.hasOwnProperty.call(confidenceScores, plant.name)
      ? confidenceScores[plant.name]
      : 0; // rubric 0: placeholder-grade until scored

    return {
      crop: slug,
      timing: { kind: "verbatim", grid: plant.months },
      ...(g.varietiesText ? { varieties: g.varietiesText } : {}),
      ...(g.tipsText ? { tips: g.tipsText } : {}),
      provenance: {
        confidence,
        sources: evidence.map((s) => s.id),
        ...(note ? { note } : {}),
      },
    };
  });

  return {
    schemaVersion: 1,
    id: "piedmont-nc",
    name: "North Carolina Piedmont",
    description:
      "Hand-reviewed override for the NC Piedmont (Carrboro reference point, on the 7b/8a line). Mechanically derived from data.js with verbatim timing.",
    footprint: { kind: "bbox", minLat: 33.6, minLng: -81.6, maxLat: 36.6, maxLng: -78.6 },
    zones: ["7b", "8a"],
    // Honesty-by-distance (D8): the data was validated at one point, not
    // uniformly across the footprint.
    referencePoint: { lat: 35.91, lng: -79.075, label: "Carrboro, NC" },
    sources: Object.fromEntries(
      Object.entries(sourceLibrary).map(([id, s]) => [id, { label: s.label, url: s.url }])
    ),
    crops,
    // Region-scoped extras that would otherwise be orphaned by the transition
    // (see the transition-cost ledger): the chore calendar and the
    // greenhouse-confidence subsystem, carried verbatim; per-crop maps re-keyed
    // to catalog slugs.
    regional: {
      tasks,
      greenhouse: {
        rules: greenhouseRules,
        cropConfidence: Object.fromEntries(
          Object.entries(greenhouseConfidence).map(([name, v]) => [
            slugify(name),
            { level: v.level, ...(v.note ? { note: v.note } : {}) },
          ])
        ),
        cropRuleCategory: Object.fromEntries(
          Object.entries(greenhouseRuleCategory).map(([name, cat]) => [slugify(name), cat])
        ),
      },
      confidenceRubric: Object.fromEntries(
        Object.entries(confidenceRubric).map(([score, text]) => [String(score), text])
      ),
    },
  };
}

// CLI: print the generated pack.
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const rootDir = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
  process.stdout.write(JSON.stringify(loadLegacyPiedmontPack(rootDir), null, 2) + "\n");
}
