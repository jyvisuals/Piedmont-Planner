// Tests for the phase-1 static-JSON providers (D6/D7).
// The JSON seed tables are loaded HERE with node:fs and passed into the
// factories as plain data — the providers module itself has no I/O, which is
// exactly the browser contract.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  buildSiteContext,
  createStaticFrostProvider,
  createStaticZoneProvider,
  haversineKm,
  REFERENCE_FROST_KEY,
} from "../providers/static.ts";

const here = dirname(fileURLToPath(import.meta.url));
const frostTable = JSON.parse(
  readFileSync(join(here, "../providers/data/frost-stations.json"), "utf8")
);
const zoneTable = JSON.parse(
  readFileSync(join(here, "../providers/data/zone-points.json"), "utf8")
);

const providers = {
  frost: createStaticFrostProvider(frostTable),
  zone: createStaticZoneProvider(zoneTable),
};

// Downtown Carrboro, NC — ~0.9 km from the Chapel Hill 2 W station.
const CARRBORO = { lat: 35.9101, lng: -79.0753 };

function stationById(id) {
  const s = frostTable.stations.find((s) => s.id === id);
  assert.ok(s, `seed table should contain station ${id}`);
  return s;
}

// ---------------------------------------------------------------------------
// Nearest-station selection
// ---------------------------------------------------------------------------

test("nearest station at Carrboro is Chapel Hill 2 W, not RDU/Greensboro", async () => {
  const frost = await providers.frost.frostTable(CARRBORO.lat, CARRBORO.lng);
  assert.equal(frost.station.id, "USC00311677");
  assert.ok(
    frost.station.distanceKm < 2,
    `Chapel Hill 2 W is ~1 km away, got ${frost.station.distanceKm}`
  );
});

test("nearest station tracks the query point across the seed table", async () => {
  // Downtown Minneapolis → MSP airport station, not Duluth.
  const msp = await providers.frost.frostTable(44.9778, -93.265);
  assert.equal(msp.station.id, "USW00014922");
  // Downtown Phoenix → Sky Harbor.
  const phx = await providers.frost.frostTable(33.4484, -112.074);
  assert.equal(phx.station.id, "USW00023183");
});

test("nearest selection uses great-circle distance (synthetic 3-station table)", async () => {
  // At lat 60, one degree of longitude is ~half a degree of latitude —
  // a naive euclidean lat/lng metric picks the wrong station here.
  const table = {
    datasetVersions: { ncei: "test" },
    stations: [
      { id: "LNG", name: "1.6 deg east", lat: 60, lng: 1.6, lastFrost: { "32/50": 100 }, firstFrost: { "32/50": 280 } },
      { id: "LAT", name: "1 deg north", lat: 61, lng: 0, lastFrost: { "32/50": 120 }, firstFrost: { "32/50": 260 } },
    ],
  };
  const p = createStaticFrostProvider(table);
  const got = await p.frostTable(60, 0);
  assert.equal(got.station.id, "LNG"); // ~89 km vs ~111 km
  assert.ok(
    Math.abs(haversineKm(60, 0, 60, 1.6) - 89) < 2,
    "haversine sanity: 1.6 deg lng at lat 60 is ~89 km"
  );
});

// ---------------------------------------------------------------------------
// SiteContext assembly + serializability
// ---------------------------------------------------------------------------

test("buildSiteContext assembles a plain, JSON-round-trippable SiteContext", async () => {
  const ctx = await buildSiteContext(CARRBORO.lat, CARRBORO.lng, providers);

  // Plain serializable data (D6): survives a JSON round trip unchanged.
  assert.deepStrictEqual(JSON.parse(JSON.stringify(ctx)), ctx);

  assert.equal(ctx.lat, CARRBORO.lat);
  assert.equal(ctx.lng, CARRBORO.lng);
  assert.equal(ctx.frost.station.id, "USC00311677");
  // 2023 USDA map puts the Carrboro/Chapel Hill area in 8a (PRISM ZIP 27510).
  assert.equal(ctx.zone, "8a");
  // Dataset pins from both providers merge (D8).
  assert.deepStrictEqual(ctx.datasetVersions, { ncei: "1991-2020", phz: "2023" });
});

test("SiteContext frost table is a copy, not an alias of the seed table", async () => {
  const ctx = await buildSiteContext(CARRBORO.lat, CARRBORO.lng, providers);
  const station = stationById("USC00311677");
  ctx.frost.lastFrost["32/50"] = 999;
  assert.notEqual(station.lastFrost["32/50"], 999, "seed table must not be mutated");
});

// ---------------------------------------------------------------------------
// frostFreeDays arithmetic
// ---------------------------------------------------------------------------

test("frostFreeDays = firstFrost − lastFrost at the 32/50 reference", async () => {
  assert.equal(REFERENCE_FROST_KEY, "32/50");
  const ctx = await buildSiteContext(CARRBORO.lat, CARRBORO.lng, providers);
  const station = stationById("USC00311677");
  assert.equal(
    ctx.frostFreeDays,
    station.firstFrost["32/50"] - station.lastFrost["32/50"]
  );
  // Fetched NCEI values: last 03/31 (day 90), first 11/03 (day 307) → 217.
  assert.equal(ctx.frostFreeDays, 217);
});

test("frostFreeDays wraps the year when first freeze lands in January (Phoenix)", async () => {
  const ctx = await buildSiteContext(33.4484, -112.074, providers);
  assert.equal(ctx.frost.station.id, "USW00023183");
  const station = stationById("USW00023183");
  const first = station.firstFrost["32/50"]; // fetched: 01/03 → day 3
  const last = station.lastFrost["32/50"]; // fetched: 01/05 → day 5
  assert.ok(first < last, "Phoenix is the wrap case the seed data provides");
  assert.equal(ctx.frostFreeDays, first - last + 365);
  assert.ok(
    ctx.frostFreeDays > 300 && ctx.frostFreeDays < 366,
    `nearly year-round frost-free, got ${ctx.frostFreeDays}`
  );
});

// ---------------------------------------------------------------------------
// Carrboro-area sanity against the real NCEI data
// ---------------------------------------------------------------------------

test("Carrboro lastFrost 32/50 lands in March–May (real 1991-2020 normals)", async () => {
  const frost = await providers.frost.frostTable(CARRBORO.lat, CARRBORO.lng);
  const day = frost.lastFrost["32/50"];
  const MAR_1 = 60; // non-leap day-of-year
  const MAY_31 = 151;
  assert.ok(
    day >= MAR_1 && day <= MAY_31,
    `lastFrost 32/50 should be in March–May, got day ${day}`
  );
  // NCEI probability ordering: the 10% ("or later") date is later than the 90%.
  assert.ok(frost.lastFrost["32/10"] > frost.lastFrost["32/90"]);
  // And fall mirrors it: first-freeze 10% ("or earlier") is earlier than 90%.
  assert.ok(frost.firstFrost["32/10"] < frost.firstFrost["32/90"]);
});

// ---------------------------------------------------------------------------
// Missing keys stay absent — never fabricated
// ---------------------------------------------------------------------------

test("a frost key missing from the table stays absent in the provider output", async () => {
  const table = {
    datasetVersions: { ncei: "test" },
    stations: [
      {
        id: "ONLY3250",
        name: "synthetic",
        lat: 0,
        lng: 0,
        lastFrost: { "32/50": 90 },
        firstFrost: { "32/50": 300 },
      },
    ],
  };
  const p = createStaticFrostProvider(table);
  const frost = await p.frostTable(0, 0);
  assert.equal(frost.lastFrost["32/50"], 90);
  assert.ok(!("28/50" in frost.lastFrost), "28/50 was never supplied — must stay absent");
  assert.deepStrictEqual(Object.keys(frost.lastFrost), ["32/50"]);
  assert.deepStrictEqual(Object.keys(frost.firstFrost), ["32/50"]);
});

test("real seed data: Phoenix carries only the thresholds NCEI published", async () => {
  // The fetched Sky Harbor CSV has freeze dates only for 32°F and 36°F —
  // colder thresholds never occur there, and were left out, not invented.
  const frost = await providers.frost.frostTable(33.4484, -112.074);
  assert.equal(frost.station.id, "USW00023183");
  assert.ok("32/50" in frost.lastFrost);
  assert.ok("36/50" in frost.lastFrost);
  for (const t of [28, 24, 20, 16]) {
    assert.ok(
      !(`${t}/50` in frost.lastFrost),
      `Phoenix has no ${t}°F freeze date in the 1991-2020 normals`
    );
  }
});

test("buildSiteContext refuses to invent a missing 32/50 reference", async () => {
  const table = {
    datasetVersions: {},
    stations: [
      { id: "NO3250", name: "synthetic", lat: 0, lng: 0, lastFrost: { "28/50": 80 }, firstFrost: { "28/50": 310 } },
    ],
  };
  const p = { frost: createStaticFrostProvider(table), zone: providers.zone };
  await assert.rejects(
    () => buildSiteContext(0, 0, p),
    /no 32\/50 entry/,
    "missing reference key must throw, not fabricate"
  );
});

// ---------------------------------------------------------------------------
// Zone provider
// ---------------------------------------------------------------------------

test("zone lookup returns the nearest seed point's zone", async () => {
  assert.equal(await providers.zone.zone(CARRBORO.lat, CARRBORO.lng), "8a");
  assert.equal(await providers.zone.zone(44.9778, -93.265), "5a"); // Minneapolis
  assert.equal(await providers.zone.zone(46.7867, -92.1005), "4b"); // Duluth
});

test("provider methods honor the async seam (promises, not bare values)", () => {
  const frostResult = providers.frost.frostTable(0, 0);
  const zoneResult = providers.zone.zone(0, 0);
  assert.ok(frostResult instanceof Promise);
  assert.ok(zoneResult instanceof Promise);
});
