// Runtime pack validator (D9 follow-through).
// =====================================================
// TypeScript types protect only TS-authored packs; contributor packs arrive as
// JSON and get structural validation HERE, at load time, with precise
// JSON-path-like locators on every error (e.g.
// `crops[3].timing.events[2].offsetDays: [10, -5] inverted ...`).
//
// Design rules:
//   • Pure module — no Node imports, zero dependencies, hand-rolled checks.
//   • Collect ALL errors; never throw on malformed input.
//   • On success the value is returned typed as RegionPack. That is a type
//     ASSERTION, not a proof: the structural checks below cover every field the
//     contract requires, so after they pass the assertion is sound for any
//     JSON-shaped input. (TS cannot narrow `unknown` to RegionPack across a
//     dynamic walk, so the cast is the documented seam.)
// ---------------------------------------------------------------------------
// Legal-value tables (mirror types.ts — keep in sync with the contract layer).
// ---------------------------------------------------------------------------
const HALF_MONTH_CODES = ["s", "si", "sg", "t", "tg", "B", "h", "*"];
const MONTH_IDS = [
    "jan", "feb", "mar", "apr", "may", "jun",
    "jul", "aug", "sep", "oct", "nov", "dec",
];
const NON_HARVEST_ACTIVITIES = [
    "sowIndoors", "sowOutdoors", "sowGreenhouse",
    "transplant", "transplantGreenhouse", "plantSet",
];
const ANCHOR_KINDS = [
    "lastFrost", "firstFrost", "soilTemp", "photoperiod", "gddAccum", "calendarDate",
];
const FROST_THRESHOLDS_F = [36, 32, 28, 24, 20, 16];
const FROST_PROBABILITIES_PCT = [90, 80, 70, 60, 50, 40, 30, 20, 10];
const HARVEST_METHODS = ["direct", "transplant"];
const FOOTPRINT_KINDS = ["bbox", "polygon", "counties"];
/** Lowercase alphanumerics separated by single hyphens, e.g. "pea-snap-pole". */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FIPS_RE = /^[0-9]+$/;
const HTTP_URL_RE = /^https?:\/\/\S+$/;
// ---------------------------------------------------------------------------
// Small helpers.
// ---------------------------------------------------------------------------
function isRecord(v) {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}
function describe(v) {
    if (v === null)
        return "null";
    if (Array.isArray(v))
        return "an array";
    if (typeof v === "string")
        return JSON.stringify(v);
    if (typeof v === "object")
        return "an object";
    return `${typeof v} ${String(v)}`;
}
function quoteList(values) {
    return values.map((v) => (typeof v === "string" ? `"${v}"` : String(v))).join(", ");
}
/** Error collector: every message is `<path>: <reason>`; root path renders as `$`. */
class Errors {
    list = [];
    at(path, reason) {
        this.list.push(`${path === "" ? "$" : path}: ${reason}`);
    }
}
function checkNonEmptyString(errors, path, v) {
    if (typeof v !== "string" || v.trim() === "") {
        errors.at(path, `expected a non-empty string, got ${describe(v)}`);
        return false;
    }
    return true;
}
/** Optional field: absent/undefined is fine; if present it must be a string. */
function checkOptionalString(errors, path, v) {
    if (v !== undefined && typeof v !== "string") {
        errors.at(path, `expected a string if present, got ${describe(v)}`);
    }
}
function checkFiniteNumber(errors, path, v) {
    if (typeof v !== "number" || !Number.isFinite(v)) {
        errors.at(path, `expected a finite number, got ${describe(v)}`);
        return false;
    }
    return true;
}
function checkLat(errors, path, v) {
    if (!checkFiniteNumber(errors, path, v))
        return false;
    if (v < -90 || v > 90) {
        errors.at(path, `latitude ${v} out of bounds (must be within [-90, 90])`);
        return false;
    }
    return true;
}
function checkLng(errors, path, v) {
    if (!checkFiniteNumber(errors, path, v))
        return false;
    if (v < -180 || v > 180) {
        errors.at(path, `longitude ${v} out of bounds (must be within [-180, 180])`);
        return false;
    }
    return true;
}
// ---------------------------------------------------------------------------
// Footprint.
// ---------------------------------------------------------------------------
function validateFootprint(errors, path, v) {
    if (!isRecord(v)) {
        errors.at(path, `expected an object, got ${describe(v)}`);
        return;
    }
    const kind = v["kind"];
    if (kind === "bbox") {
        const latOk = checkLat(errors, `${path}.minLat`, v["minLat"]) &&
            checkLat(errors, `${path}.maxLat`, v["maxLat"]);
        const lngOk = checkLng(errors, `${path}.minLng`, v["minLng"]) &&
            checkLng(errors, `${path}.maxLng`, v["maxLng"]);
        if (latOk && v["minLat"] > v["maxLat"]) {
            errors.at(path, `bbox inverted: minLat ${String(v["minLat"])} > maxLat ${String(v["maxLat"])}`);
        }
        if (lngOk && v["minLng"] > v["maxLng"]) {
            errors.at(path, `bbox inverted: minLng ${String(v["minLng"])} > maxLng ${String(v["maxLng"])}`);
        }
    }
    else if (kind === "polygon") {
        const ring = v["ring"];
        if (!Array.isArray(ring)) {
            errors.at(`${path}.ring`, `expected an array of [lng, lat] pairs, got ${describe(ring)}`);
            return;
        }
        if (ring.length < 3) {
            errors.at(`${path}.ring`, `polygon ring has ${ring.length} point(s); needs at least 3 [lng, lat] pairs`);
        }
        for (let i = 0; i < ring.length; i++) {
            const pt = ring[i];
            if (!Array.isArray(pt) || pt.length !== 2) {
                errors.at(`${path}.ring[${i}]`, `expected a [lng, lat] pair, got ${describe(pt)}`);
                continue;
            }
            checkLng(errors, `${path}.ring[${i}][0]`, pt[0]);
            checkLat(errors, `${path}.ring[${i}][1]`, pt[1]);
        }
    }
    else if (kind === "counties") {
        const fips = v["fips"];
        if (!Array.isArray(fips)) {
            errors.at(`${path}.fips`, `expected an array of FIPS code strings, got ${describe(fips)}`);
            return;
        }
        if (fips.length === 0) {
            errors.at(`${path}.fips`, "must list at least one FIPS code");
        }
        for (let i = 0; i < fips.length; i++) {
            const code = fips[i];
            if (typeof code !== "string" || code === "" || !FIPS_RE.test(code)) {
                errors.at(`${path}.fips[${i}]`, `expected a non-empty string of digits, got ${describe(code)}`);
            }
        }
    }
    else {
        errors.at(`${path}.kind`, `unknown footprint kind ${describe(kind)} (expected one of ${quoteList(FOOTPRINT_KINDS)})`);
    }
}
// ---------------------------------------------------------------------------
// Sources map.
// ---------------------------------------------------------------------------
/** Returns the set of valid source ids (for provenance cross-checks), or null. */
function validateSources(errors, path, v) {
    if (!isRecord(v)) {
        errors.at(path, `expected an object mapping source ids to {label, url}, got ${describe(v)}`);
        return null;
    }
    const ids = new Set();
    for (const [id, src] of Object.entries(v)) {
        ids.add(id);
        const p = `${path}.${id}`;
        if (!isRecord(src)) {
            errors.at(p, `expected a {label, url} object, got ${describe(src)}`);
            continue;
        }
        checkNonEmptyString(errors, `${p}.label`, src["label"]);
        const url = src["url"];
        if (typeof url !== "string" || !HTTP_URL_RE.test(url)) {
            errors.at(`${p}.url`, `expected an http(s) URL, got ${describe(url)}`);
        }
    }
    return ids;
}
// ---------------------------------------------------------------------------
// Provenance.
// ---------------------------------------------------------------------------
function validateProvenance(errors, path, v, sourceIds) {
    if (!isRecord(v)) {
        errors.at(path, `expected a provenance object, got ${describe(v)}`);
        return;
    }
    const confidence = v["confidence"];
    if (typeof confidence !== "number" ||
        !Number.isInteger(confidence) ||
        confidence < 0 ||
        confidence > 5) {
        errors.at(`${path}.confidence`, `expected an integer 0-5, got ${describe(confidence)}`);
    }
    const sources = v["sources"];
    if (!Array.isArray(sources)) {
        errors.at(`${path}.sources`, `expected an array of source ids, got ${describe(sources)}`);
    }
    else {
        for (let i = 0; i < sources.length; i++) {
            const id = sources[i];
            if (!checkNonEmptyString(errors, `${path}.sources[${i}]`, id))
                continue;
            // Only cross-check ids when the pack's sources map itself parsed.
            if (sourceIds !== null && !sourceIds.has(id)) {
                errors.at(`${path}.sources[${i}]`, `cites unknown source id "${id}" (not in the pack's sources map)`);
            }
        }
    }
    checkOptionalString(errors, `${path}.note`, v["note"]);
}
// ---------------------------------------------------------------------------
// Timing — verbatim half-month grid.
// ---------------------------------------------------------------------------
function validateHalfSlot(errors, path, v) {
    if (!Array.isArray(v)) {
        errors.at(path, `expected an array of half-month codes, got ${describe(v)}`);
        return;
    }
    const seen = new Set();
    for (let i = 0; i < v.length; i++) {
        const code = v[i];
        if (typeof code !== "string" || !HALF_MONTH_CODES.includes(code)) {
            errors.at(`${path}[${i}]`, `illegal code ${describe(code)} (expected one of ${quoteList(HALF_MONTH_CODES)})`);
            continue;
        }
        if (seen.has(code)) {
            errors.at(`${path}[${i}]`, `duplicate code "${code}" within one half-month slot`);
        }
        seen.add(code);
    }
}
function validateGrid(errors, path, v) {
    if (!isRecord(v)) {
        errors.at(path, `expected a half-month grid object, got ${describe(v)}`);
        return;
    }
    for (const month of MONTH_IDS) {
        if (!(month in v)) {
            errors.at(path, `missing month "${month}" (a verbatim grid needs exactly jan-dec)`);
        }
    }
    for (const key of Object.keys(v)) {
        if (!MONTH_IDS.includes(key)) {
            errors.at(path, `unknown month key "${key}" (a verbatim grid needs exactly jan-dec)`);
        }
    }
    for (const month of MONTH_IDS) {
        if (!(month in v))
            continue;
        const cell = v[month];
        const p = `${path}.${month}`;
        if (!isRecord(cell)) {
            errors.at(p, `expected a {half1, half2} object, got ${describe(cell)}`);
            continue;
        }
        validateHalfSlot(errors, `${p}.half1`, cell["half1"]);
        validateHalfSlot(errors, `${p}.half2`, cell["half2"]);
    }
}
// ---------------------------------------------------------------------------
// Timing — anchored events.
// ---------------------------------------------------------------------------
function validateFrostRef(errors, path, v) {
    if (v === undefined)
        return; // ref is optional (defaults pinned in DEFAULT_FROST_REF)
    if (!isRecord(v)) {
        errors.at(path, `expected a {thresholdF?, probabilityPct?} object, got ${describe(v)}`);
        return;
    }
    const threshold = v["thresholdF"];
    if (threshold !== undefined &&
        !FROST_THRESHOLDS_F.includes(threshold)) {
        errors.at(`${path}.thresholdF`, `illegal frost threshold ${describe(threshold)} (expected one of ${quoteList(FROST_THRESHOLDS_F)})`);
    }
    const probability = v["probabilityPct"];
    if (probability !== undefined &&
        !FROST_PROBABILITIES_PCT.includes(probability)) {
        errors.at(`${path}.probabilityPct`, `illegal frost probability ${describe(probability)} (expected one of ${quoteList(FROST_PROBABILITIES_PCT)})`);
    }
}
function validateAnchor(errors, path, v) {
    if (!isRecord(v)) {
        errors.at(path, `expected an anchor object, got ${describe(v)}`);
        return;
    }
    const kind = v["kind"];
    switch (kind) {
        case "lastFrost":
        case "firstFrost":
            validateFrostRef(errors, `${path}.ref`, v["ref"]);
            break;
        case "soilTemp": {
            const depth = v["depthIn"];
            if (checkFiniteNumber(errors, `${path}.depthIn`, depth) && depth <= 0) {
                errors.at(`${path}.depthIn`, `soil-temp depth must be > 0 inches, got ${depth}`);
            }
            const threshold = v["thresholdF"];
            if (checkFiniteNumber(errors, `${path}.thresholdF`, threshold) &&
                (threshold < 32 || threshold > 110)) {
                errors.at(`${path}.thresholdF`, `soil-temp threshold ${threshold}°F implausible (expected within [32, 110])`);
            }
            const direction = v["direction"];
            if (direction !== "rising" && direction !== "falling") {
                errors.at(`${path}.direction`, `expected "rising" or "falling", got ${describe(direction)}`);
            }
            break;
        }
        case "photoperiod": {
            const hours = v["hours"];
            if (checkFiniteNumber(errors, `${path}.hours`, hours) && (hours <= 0 || hours >= 24)) {
                errors.at(`${path}.hours`, `photoperiod hours must be within (0, 24), got ${hours}`);
            }
            const direction = v["direction"];
            if (direction !== "lengthening" && direction !== "shortening") {
                errors.at(`${path}.direction`, `expected "lengthening" or "shortening", got ${describe(direction)}`);
            }
            break;
        }
        case "gddAccum": {
            const base = v["baseF"];
            if (checkFiniteNumber(errors, `${path}.baseF`, base) && (base < 0 || base > 100)) {
                errors.at(`${path}.baseF`, `GDD base ${base}°F implausible (expected within [0, 100])`);
            }
            const sum = v["sum"];
            if (checkFiniteNumber(errors, `${path}.sum`, sum) && sum <= 0) {
                errors.at(`${path}.sum`, `GDD sum must be > 0, got ${sum}`);
            }
            break;
        }
        case "calendarDate": {
            const month = v["month"];
            if (typeof month !== "number" || !Number.isInteger(month) || month < 1 || month > 12) {
                errors.at(`${path}.month`, `expected an integer 1-12, got ${describe(month)}`);
            }
            const day = v["day"];
            if (typeof day !== "number" || !Number.isInteger(day) || day < 1 || day > 31) {
                errors.at(`${path}.day`, `expected an integer 1-31, got ${describe(day)}`);
            }
            break;
        }
        default:
            errors.at(`${path}.kind`, `unknown anchor kind ${describe(kind)} (expected one of ${quoteList(ANCHOR_KINDS)})`);
    }
}
function validateOffsetDays(errors, path, v) {
    if (!Array.isArray(v) || v.length !== 2) {
        errors.at(path, `expected a [earliest, latest] pair of day offsets, got ${describe(v)}`);
        return;
    }
    const lo = v[0];
    const hi = v[1];
    let pairOk = true;
    if (typeof lo !== "number" || !Number.isInteger(lo)) {
        errors.at(`${path}[0]`, `expected a finite integer day offset, got ${describe(lo)}`);
        pairOk = false;
    }
    if (typeof hi !== "number" || !Number.isInteger(hi)) {
        errors.at(`${path}[1]`, `expected a finite integer day offset, got ${describe(hi)}`);
        pairOk = false;
    }
    if (pairOk && lo > hi) {
        errors.at(path, `[${String(lo)}, ${String(hi)}] inverted (earliest must be ≤ latest)`);
    }
}
function validateEvents(errors, path, v) {
    if (!Array.isArray(v)) {
        errors.at(path, `expected an array of timing events, got ${describe(v)}`);
        return;
    }
    if (v.length === 0) {
        errors.at(path, "anchored timing needs at least one event");
        return;
    }
    // First pass: collect ids and note which of them are harvests, so a
    // fromEventId can be checked against the whole list regardless of order.
    const seenIds = new Map();
    const harvestIds = new Set();
    for (let i = 0; i < v.length; i++) {
        const ev = v[i];
        if (!isRecord(ev))
            continue; // reported in second pass
        const id = ev["id"];
        if (typeof id === "string" && id !== "") {
            const first = seenIds.get(id);
            if (first !== undefined) {
                errors.at(`${path}[${i}].id`, `duplicate event id "${id}" (first used at ${path}[${first}])`);
            }
            else {
                seenIds.set(id, i);
                if (ev["activity"] === "harvest")
                    harvestIds.add(id);
            }
        }
    }
    for (let i = 0; i < v.length; i++) {
        const ev = v[i];
        const p = `${path}[${i}]`;
        if (!isRecord(ev)) {
            errors.at(p, `expected an event object, got ${describe(ev)}`);
            continue;
        }
        checkNonEmptyString(errors, `${p}.id`, ev["id"]);
        checkOptionalString(errors, `${p}.note`, ev["note"]);
        const activity = ev["activity"];
        if (activity === "harvest") {
            // DerivedHarvest: fromEventId → an existing NON-harvest event in this list.
            const from = ev["fromEventId"];
            if (checkNonEmptyString(errors, `${p}.fromEventId`, from)) {
                if (!seenIds.has(from)) {
                    errors.at(`${p}.fromEventId`, `references "${from}", which matches no event id in this list`);
                }
                else if (harvestIds.has(from)) {
                    errors.at(`${p}.fromEventId`, `references "${from}", which is itself a harvest (must reference a non-harvest planting event)`);
                }
            }
            const method = ev["method"];
            if (!HARVEST_METHODS.includes(method)) {
                errors.at(`${p}.method`, `expected one of ${quoteList(HARVEST_METHODS)}, got ${describe(method)}`);
            }
        }
        else if (NON_HARVEST_ACTIVITIES.includes(activity)) {
            // AnchoredEvent.
            validateAnchor(errors, `${p}.anchor`, ev["anchor"]);
            validateOffsetDays(errors, `${p}.offsetDays`, ev["offsetDays"]);
            if (ev["gate"] !== undefined)
                validateAnchor(errors, `${p}.gate`, ev["gate"]);
            const special = ev["special"];
            if (special !== undefined && typeof special !== "boolean") {
                errors.at(`${p}.special`, `expected a boolean if present, got ${describe(special)}`);
            }
        }
        else {
            errors.at(`${p}.activity`, `unknown activity ${describe(activity)} (expected "harvest" or one of ${quoteList(NON_HARVEST_ACTIVITIES)})`);
        }
    }
}
// ---------------------------------------------------------------------------
// Timing union.
// ---------------------------------------------------------------------------
function validateTiming(errors, path, v) {
    if (!isRecord(v)) {
        errors.at(path, `expected a timing object, got ${describe(v)}`);
        return;
    }
    const kind = v["kind"];
    if (kind === "verbatim") {
        validateGrid(errors, `${path}.grid`, v["grid"]);
    }
    else if (kind === "anchored") {
        validateEvents(errors, `${path}.events`, v["events"]);
    }
    else {
        errors.at(`${path}.kind`, `unknown timing kind ${describe(kind)} (expected "verbatim" or "anchored")`);
    }
}
// ---------------------------------------------------------------------------
// Crop rows.
// ---------------------------------------------------------------------------
function validateCropRow(errors, path, v, sourceIds, seenSlugs, index) {
    if (!isRecord(v)) {
        errors.at(path, `expected a crop-override object, got ${describe(v)}`);
        return;
    }
    const crop = v["crop"];
    if (checkNonEmptyString(errors, `${path}.crop`, crop)) {
        if (!SLUG_RE.test(crop)) {
            errors.at(`${path}.crop`, `"${crop}" is not slug-shaped (lowercase alphanumerics and single hyphens, e.g. "pea-snap-pole")`);
        }
        else {
            const first = seenSlugs.get(crop);
            if (first !== undefined) {
                errors.at(`${path}.crop`, `duplicate crop slug "${crop}" (first used at crops[${first}])`);
            }
            else {
                seenSlugs.set(crop, index);
            }
        }
    }
    checkOptionalString(errors, `${path}.varieties`, v["varieties"]);
    checkOptionalString(errors, `${path}.tips`, v["tips"]);
    const excluded = v["excluded"];
    if (excluded !== undefined && typeof excluded !== "boolean") {
        errors.at(`${path}.excluded`, `expected a boolean if present, got ${describe(excluded)}`);
    }
    if (excluded === true && v["timing"] !== undefined) {
        errors.at(path, `excluded row must not carry "timing" (exclusion hides the crop entirely)`);
    }
    if (v["timing"] !== undefined) {
        validateTiming(errors, `${path}.timing`, v["timing"]);
    }
    validateProvenance(errors, `${path}.provenance`, v["provenance"], sourceIds);
}
// ---------------------------------------------------------------------------
// Entry point.
// ---------------------------------------------------------------------------
export function validateRegionPack(value) {
    const errors = new Errors();
    if (!isRecord(value)) {
        errors.at("", `expected a region-pack object, got ${describe(value)}`);
        return { ok: false, errors: errors.list };
    }
    if (value["schemaVersion"] !== 1) {
        errors.at("schemaVersion", `expected 1, got ${describe(value["schemaVersion"])}`);
    }
    checkNonEmptyString(errors, "id", value["id"]);
    checkNonEmptyString(errors, "name", value["name"]);
    checkOptionalString(errors, "description", value["description"]);
    const tieBreaker = value["specificityTieBreaker"];
    if (tieBreaker !== undefined && (typeof tieBreaker !== "number" || !Number.isFinite(tieBreaker))) {
        errors.at("specificityTieBreaker", `expected a finite number if present, got ${describe(tieBreaker)}`);
    }
    const zones = value["zones"];
    if (zones !== undefined) {
        if (!Array.isArray(zones)) {
            errors.at("zones", `expected an array of zone strings if present, got ${describe(zones)}`);
        }
        else {
            for (let i = 0; i < zones.length; i++) {
                checkNonEmptyString(errors, `zones[${i}]`, zones[i]);
            }
        }
    }
    const refPoint = value["referencePoint"];
    if (refPoint !== undefined) {
        if (!isRecord(refPoint)) {
            errors.at("referencePoint", `expected an object if present, got ${describe(refPoint)}`);
        }
        else {
            checkLat(errors, "referencePoint.lat", refPoint["lat"]);
            checkLng(errors, "referencePoint.lng", refPoint["lng"]);
            checkOptionalString(errors, "referencePoint.label", refPoint["label"]);
        }
    }
    // `regional` is render-only content (chore calendar, greenhouse policy) —
    // structurally it just needs to be an object; its interior is displayed, not
    // interpreted, so deep validation is deliberately deferred.
    const regional = value["regional"];
    if (regional !== undefined && !isRecord(regional)) {
        errors.at("regional", `expected an object if present, got ${describe(regional)}`);
    }
    validateFootprint(errors, "footprint", value["footprint"]);
    const sourceIds = validateSources(errors, "sources", value["sources"]);
    const crops = value["crops"];
    if (!Array.isArray(crops)) {
        errors.at("crops", `expected an array of crop overrides, got ${describe(crops)}`);
    }
    else {
        const seenSlugs = new Map();
        for (let i = 0; i < crops.length; i++) {
            validateCropRow(errors, `crops[${i}]`, crops[i], sourceIds, seenSlugs, i);
        }
    }
    if (errors.list.length > 0)
        return { ok: false, errors: errors.list };
    // Structural checks above cover the full RegionPack contract; see file header.
    return { ok: true, pack: value };
}
