// Phase-1 static-JSON data providers (D6/D7).
// ============================================
// Browser-safe by construction: no Node imports, no fs, no fetch — the seed
// tables (providers/data/*.json) are parsed by the CALLER and passed in as
// plain arguments, so this same module runs in the browser, in node:test, and
// in a worker. The factories return objects satisfying the pinned provider
// interfaces in ../types.ts (every method async — the seam rule), and
// `buildSiteContext` assembles the plain-data serializable SiteContext the
// pure engine consumes.
//
// Honesty note (D8): these providers only ever COPY values out of the tables
// they are given. A frost key the table does not carry stays absent from the
// SiteContext — nothing is interpolated or invented here.
import { DEFAULT_FROST_REF } from "../types.js";
// ---------------------------------------------------------------------------
// Great-circle distance (haversine)
// ---------------------------------------------------------------------------
const EARTH_RADIUS_KM = 6371;
const DEG = Math.PI / 180;
export function haversineKm(lat1, lng1, lat2, lng2) {
    const dLat = (lat2 - lat1) * DEG;
    const dLng = (lng2 - lng1) * DEG;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * DEG) * Math.cos(lat2 * DEG) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}
/** Index of the entry nearest to (lat, lng), plus the distance. */
function nearestOf(entries, lat, lng) {
    let best;
    let bestKm = Infinity;
    for (const e of entries) {
        const km = haversineKm(lat, lng, e.lat, e.lng);
        if (km < bestKm) {
            best = e;
            bestKm = km;
        }
    }
    if (!best)
        throw new Error("nearest lookup on an empty table");
    return { entry: best, distanceKm: bestKm };
}
/** Round to 0.1 km — honest precision for a station-distance label. */
function roundKm(km) {
    return Math.round(km * 10) / 10;
}
/**
 * Nearest-station frost provider over a static NCEI table. The method is async
 * per the D6 seam rule even though the answer is synchronous — a serverless
 * impl must be drop-in.
 */
export function createStaticFrostProvider(table) {
    if (table.stations.length === 0) {
        throw new Error("createStaticFrostProvider: table has no stations");
    }
    return {
        datasetVersions: { ...table.datasetVersions },
        async frostTable(lat, lng) {
            const { entry, distanceKm } = nearestOf(table.stations, lat, lng);
            return {
                // Copies, never references — a SiteContext must be safe to cache and
                // mutate-test without aliasing the seed table.
                lastFrost: { ...entry.lastFrost },
                firstFrost: { ...entry.firstFrost },
                station: { id: entry.id, distanceKm: roundKm(distanceKm) },
            };
        },
    };
}
/**
 * Nearest-point zone lookup over the 2023 USDA seed points. Explicitly
 * SEED/APPROXIMATE: the table is a sparse set of city reference points pending
 * the full PRISM ZIP/raster table, so a site far from every point gets the
 * zone of the closest city — fine for the seeded cities, wrong in general.
 */
export function createStaticZoneProvider(points) {
    if (points.points.length === 0) {
        throw new Error("createStaticZoneProvider: table has no points");
    }
    return {
        datasetVersions: { ...points.datasetVersions },
        async zone(lat, lng) {
            return nearestOf(points.points, lat, lng).entry.zone;
        },
    };
}
// ---------------------------------------------------------------------------
// SiteContext assembly (D6/D7)
// ---------------------------------------------------------------------------
/** The FrostKey of a FrostAnchorRef, e.g. "32/50". */
function frostKeyOf(ref) {
    return `${ref.thresholdF}/${ref.probabilityPct}`;
}
/** The reference key frostFreeDays is computed at (pinned 32°F / 50%). */
export const REFERENCE_FROST_KEY = frostKeyOf(DEFAULT_FROST_REF);
/**
 * Assemble the plain-data serializable SiteContext (no functions, no class
 * instances — cacheable in localStorage, snapshottable as a test fixture).
 *
 * frostFreeDays = firstFrost − lastFrost at the 32°F/50% reference. In warm
 * climates NCEI's median "first fall freeze" lands in January of the NEXT
 * calendar year (e.g. Phoenix: first day 3, last day 5), making the raw
 * difference negative; the frost-free season wraps the year boundary, so 365
 * is added — arithmetic normalization of real values, not invented data.
 */
export async function buildSiteContext(lat, lng, providers) {
    const [frost, zone] = await Promise.all([
        providers.frost.frostTable(lat, lng),
        providers.zone.zone(lat, lng),
    ]);
    const last = frost.lastFrost[REFERENCE_FROST_KEY];
    const first = frost.firstFrost[REFERENCE_FROST_KEY];
    if (last === undefined || first === undefined) {
        throw new Error(`buildSiteContext: station ${frost.station.id} has no ` +
            `${REFERENCE_FROST_KEY} entry for ${last === undefined ? "lastFrost" : "firstFrost"} — ` +
            `cannot compute frostFreeDays (values are never invented)`);
    }
    const raw = first - last;
    const frostFreeDays = raw < 0 ? raw + 365 : raw;
    return {
        lat,
        lng,
        zone,
        frostFreeDays,
        frost,
        datasetVersions: {
            ...(providers.frost.datasetVersions ?? {}),
            ...(providers.zone.datasetVersions ?? {}),
        },
    };
}
