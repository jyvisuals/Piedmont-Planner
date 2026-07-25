// Builds the browser-consumable app layer from the TypeScript schema.
//
// The repo's rule (see README "Regenerating Icons"): generated artifacts are
// COMMITTED, so there is no build step at deploy time. This script emits:
//   app/lib/**        — the schema/engine compiled to browser ES modules
//                       (tsc with rewriteRelativeImportExtensions: .ts → .js)
//   app/data/piedmont-pack.json   — the full verbatim pack derived from data.js
//   app/data/frost-stations.json  — copy of the provider seed data
//   app/data/zone-points.json     — copy of the provider seed data
//
// CI regenerates all of it and fails if the committed copies are stale
// (see .github/workflows/test.yml), so app/ can never drift from source.
//
// Run: node scripts/build-app-lib.mjs

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const libDir = path.join(rootDir, "app", "lib");
const dataDir = path.join(rootDir, "app", "data");

// 1. Compile the schema to ES modules the browser can load directly.
// Prefer a locally installed tsc; fall back to fetching typescript@6 (CI).
fs.rmSync(libDir, { recursive: true, force: true });
let tscArgs = ["--no-install", "tsc"];
try {
  execFileSync("npx", [...tscArgs, "--version"], { cwd: rootDir, stdio: "ignore" });
} catch {
  tscArgs = ["--yes", "-p", "typescript@6", "tsc"];
}
execFileSync("npx", [...tscArgs, "-p", "schema/tsconfig.build.json"], {
  cwd: rootDir,
  stdio: "inherit",
});

// 2. Derive the full verbatim Piedmont pack from data.js (single source of truth).
const { loadLegacyPiedmontPack } = await import("../schema/loader/load-legacy.mjs");
fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(
  path.join(dataDir, "piedmont-pack.json"),
  JSON.stringify(loadLegacyPiedmontPack(rootDir)) + "\n"
);

// 3. Copy the provider seed tables next to it.
for (const name of ["frost-stations.json", "zone-points.json"]) {
  fs.copyFileSync(
    path.join(rootDir, "schema", "providers", "data", name),
    path.join(dataDir, name)
  );
}

const emitted = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else emitted.push(path.relative(rootDir, p));
  }
})(libDir);
console.log(`build-app-lib: ${emitted.length} modules in app/lib, 3 files in app/data`);
