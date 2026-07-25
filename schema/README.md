# `schema/` — the multi-pack data contracts (spec)

This is the concrete form of decisions **D1–D5** in
[`../docs/architecture-decisions.md`](../docs/architecture-decisions.md). It is a
**spec**, not yet wired into the live app: it defines the types every pack, the
crop catalog, and the offset engine must satisfy, and ships one worked pack so
the contracts are exercised by real data instead of prose.

## Files

| File | Decision(s) | What it is |
|---|---|---|
| `types.ts` | D1–D8 | The contract layer — anchors, the timing union (verbatim grid \| anchored events), crop catalog, pack schema + footprint/precedence, provenance, and the provider/resolver seams. |
| `crop-catalog.ts` | D3, D4 | Global crop catalog, **all 77 crops**: stable slugs (matching the loader's slugification exactly, test-enforced) + structured days-to-maturity parsed from the legacy free text — 60 parsed into ranges whose bounds literally appear in the source string (test-enforced), 17 carried honestly as note-only. Hardiness classes provisional pending regional review. |
| `engine/computed-rules.ts` | D2, D8 | The computed base layer: generic estimate-grade anchored rules derived from hardiness + DTH (documented rule table in-file); perennials and no-DTH crops return `null` rather than guessing. Wired into `resolveAll` as the fallback below packs, with the frost-free-days applicability filter. Computed output carries `origin: "computed"` and no provenance (D8). |
| `providers/static.ts` + `providers/data/` | D6, D7 | Static-JSON `FrostProvider`/`ZoneProvider` + `buildSiteContext`. Seeded with **real fetched data**: 17 NCEI 1991–2020 stations (via NOAA's AWS Open Data distribution; Miami excluded — NCEI publishes no freeze dates for it) and the official PRISM 2023 zip→zone table (byte-identical across two mirrors). Missing values omitted, never estimated; source URLs recorded per station. |
| `validate-pack.ts` | D5 | Runtime validator for JSON contributor packs: `validateRegionPack(unknown)` → ok/errors with JSON-path locators; collects all errors, never throws. |
| `packs/piedmont-nc.ts` | D2, D3, D5 | Sample pack demonstrating **both timing kinds**: **tomatoes** carries its reviewed grid *verbatim* (the migration default — zero-loss), **spinach** is *anchored* (spring forward from `lastFrost`, fall/overwinter backward from `firstFrost`, harvest crossing the year boundary). |
| `engine/resolve.ts` | D0–D2, D5 | **The offset engine + resolver** — pure, synchronous, browser-safe. Anchor resolution (frost table, calendar, photoperiod from latitude), derived harvests, season-day bucketing with year wrap, footprint containment, derived pack precedence, field-level fall-through. `soilTemp`/`gddAccum` are gates only in v1 (throw as primary anchors); `counties` containment throws pending a FIPS lookup. |
| `loader/load-legacy.mjs` | D2, D5 | Mechanical `data.js` → **full verbatim Piedmont pack** (77 crops, provenance + sources from the existing review metadata). `data.js` remains the single source of truth; run it as a CLI to emit the pack as JSON. |
| `tests/*.test.mjs` | D9 | `node:test` suite (no dependencies): **the golden gate** — resolver output at Carrboro equals every `data.js` grid exactly — plus engine units (cross-year bucketing, photoperiod, precedence, exclusion). Wired into CI. |
| `tsconfig.json` | D9 | Strict typecheck (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`). |

## How the pieces map to the decisions

- **D1 — anchors are the currency.** `AnchorRef` is the fixed vocabulary
  (`lastFrost`, `firstFrost`, `soilTemp`, `photoperiod`, `gddAccum`,
  `calendarDate`). Frost is a *reference* (`FrostAnchorRef`: threshold +
  probability, default 32°F/50%), never a bare date — so the 10–90% spread stays
  expressible.
- **D2 — the timing union.** Curated packs may carry their reviewed half-month
  grid **verbatim** (`{ kind: "verbatim", grid }`) — no lossy grid→offset
  inversion, and the "Carrboro must not move" gate holds by construction. Day
  precision is opt-in via **anchored events** (`{ kind: "anchored", events }`),
  which the computed layer always uses. Spinach shows why events matter: spring
  counts forward from `lastFrost`, fall counts backward from `firstFrost`, in
  one list. Resolved windows live on the unbounded **season-day axis** (may
  exceed 366) so cross-year crops (garlic, overwinter sows) work; half-months
  are the rendering currency in both cases.
- **D3 — stable crop identity.** Everything keys off `CropSlug`. Varieties/tips
  live in the *pack* (regional); identity + DTH live in the *catalog* (global).
- **D4 — structured DTH.** `DaysToMaturity` is numeric per method; a derived
  harvest (`DerivedHarvest`) references a planting event id + a method, so the
  engine can place harvest and run the frost-free-days filter.
- **D5 — pack schema + precedence.** `RegionPack` carries `schemaVersion`,
  `footprint` geometry, `specificity` (most-specific wins), and mandatory
  `Provenance` per overriding row. Omitting `events` inherits computed timing;
  `excluded: true` hides a crop for the region.

## Verify

```bash
tsc --noEmit -p schema/tsconfig.json     # strict typecheck (from repo root)
node --test schema/tests/*.test.mjs      # 20 tests incl. the golden gate
node schema/loader/load-legacy.mjs       # emit the verbatim Piedmont pack JSON
```

Both checks run in CI (`.github/workflows/test.yml`). Tests are plain `.mjs`
importing the `.ts` engine directly — Node 22's native type stripping, no build.

## Done here

- ✅ Loader → full verbatim Piedmont pack, golden-gated (grids equal `data.js`
  exactly, resolved through the real resolver at a Carrboro fixture site), now
  including the `regional` block (chore calendar, greenhouse-confidence
  subsystem, rubric) and `referencePoint` so nothing is orphaned.
- ✅ Offset engine: anchors (frost table / calendar / photoperiod), derived
  harvests, season-day bucketing with year wrap, precedence, exclusion.
- ✅ Full 77-crop catalog with structured DTH.
- ✅ Computed base layer + applicability filter; **N=2 proven** — a Vermont
  fixture resolves all-computed with concretely different windows than
  Carrboro, while Carrboro's curated output is untouched.
- ✅ Static providers seeded with real NCEI + PRISM data; serializable
  `SiteContext` (JSON round-trip test-enforced).
- ✅ Runtime pack validator (JSON contributor packs).

## Next steps (not in this spec)

1. **App integration** — a location picker; the UI consumes
   `ResolvedCropCalendar[]` (+ `regional` for the chore list) instead of the
   `PLANTS`/`TASKS` globals; show curated-vs-computed and
   "curated at Carrboro, N km away" honesty markers; `data.js` retires into
   the pack at that point.
2. **ETL scaling** — grow the 17-station seed toward full NCEI coverage and
   ship the complete PRISM zip table (build-time Python pipeline per D9).
3. **A second curated pack** — the contribution model's first real exercise.
