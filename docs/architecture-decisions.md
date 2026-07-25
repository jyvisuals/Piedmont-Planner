# Architecture Decisions for the National / Multi-Pack Road

_Companion to `national-data-sources-research.md`. That doc covers **what** data
to pull in and the override model. This one is about the **one-way doors** — the
decisions that are cheap to make now and expensive to reverse once multiple
regional packs, a computed engine, and outside contributors all depend on them._

---

## 0. The framing: fix the seams, keep the implementations swappable

Most of this system is a **two-way door** — you can rewrite the frost-lookup
implementation, restyle the UI, add a live-weather layer, or swap a hosting
model later without much pain. A few things are **one-way doors**: change them
after packs exist and you break every pack, every cached calendar, and every
contributor's mental model at once.

So the goal upfront is *not* to build the whole thing. It's to **pin the seams**
— the small number of contracts everything else plugs into — and deliberately
defer everything behind them. The durable core is five contracts:

```
            ┌──────────────────────────────────────────────┐
   location │  RESOLVER  (pure, testable, the stable core)  │
   ────────▶│  pack.footprint ∋ location ? pack : computed   │
            └───┬───────────────┬───────────────┬───────────┘
                │               │               │
        ┌───────▼──────┐ ┌──────▼──────┐ ┌──────▼────────┐
        │ CROP CATALOG │ │ ANCHOR      │ │ DATA PROVIDERS│
        │ stable slugs │ │ VOCABULARY  │ │ frost/zone/   │
        │              │ │ (the        │ │ soil/weather  │
        │              │ │  currency)  │ │ behind ifaces │
        └───────┬──────┘ └──────┬──────┘ └───────────────┘
                │               │
            ┌───▼───────────────▼────┐
            │  PACK SCHEMA           │  ← the contract every pack signs
            │  (Piedmont = pack #1)  │
            └────────────────────────┘
```

Get those five right and almost everything else is reversible. The decisions
below are ranked by **(how hard to reverse) × (blast radius)**.

---

## D1. Anchors are the currency — define the anchor vocabulary now ⭐ (hardest to reverse)

Every timing rule in every pack, and every output of the computed engine, will
be expressed as an **offset from an anchor**. The set of anchor *types* and
their exact semantics is the deepest contract in the system: add to it freely
later, but you cannot redefine an existing anchor without rewriting every pack
that referenced it.

**Decision:** lock a small, explicit anchor vocabulary and its precise meaning.
Proposed core set:

| Anchor | Precise definition (must be pinned) | Drives |
|---|---|---|
| `lastFrost` | last spring **32°F**, **50%** probability (NCEI) | spring sow/transplant |
| `firstFrost` | first fall **32°F**, **50%** probability (NCEI) | fall planting, last-harvest |
| `soilTemp(depth, °F)` | date soil at depth crosses threshold | warm-crop set-out ("60°F @ 4″") |
| `photoperiod(hours)` | date day length crosses N hours at the lat | winter/Persephone floor |
| `gddAccum(base, sum)` | date cumulative GDD reaches sum | maturity / heat gates |
| `calendarDate` | fixed date — the escape hatch | truly date-fixed tasks |

The two non-obvious sub-decisions inside D1, **both one-way**:

1. **Frost is a distribution, not a date.** Anchor to a *named* reference
   (threshold + probability), and pin the default (32°F / 50%) but **store it as
   a parameter** so the reference could shift without a schema break. If you bake
   "the last frost date" as a single scalar, you can never expose the 10%/90%
   spread the data actually provides — and honest uncertainty is a core value
   here (see D8).
2. **Offsets are in days, not half-months.** See D2.

**Cost of getting it wrong:** every pack re-authored; every computed calendar
re-derived; contributor rules silently mean something different than before.

---

## D2. Canonical timing = day-resolution *anchored events*, rendered at half-months ⭐

Two coupled traps in today's model, both structural:

- **The 24-slot half-month grid** (`months: { jan: { half1, half2 } … }`) is a
  *display* resolution masquerading as the data model. Northern short seasons and
  succession planting need finer than 15 days to be correct, and you cannot
  render precision you never stored.
- **One crop = one grid** hides that many crops have **multiple plantings
  anchored differently** — spring lettuce counts forward from `lastFrost`, fall
  lettuce counts *backward* from `firstFrost`. Today those two seasons are
  smeared into one row of scattered codes.

**Decision (revised after review):** the **computed layer and any pack that
wants day precision** use a **list of anchored events per crop**, day-resolution:

```jsonc
// spinach fall run, one pack row (illustrative)
"events": [
  { "activity": "sowOutdoors", "anchor": "firstFrost", "offset": [-56, -14] },  // days
  { "activity": "sowOutdoors", "anchor": "firstFrost", "offset": [0, 14],
    "special": true },                                                          // overwinter intent
  { "activity": "harvest", "derived": "sow + daysToMaturity" }
]
```

**But curated packs may instead carry their timing *verbatim*** — the literal
reviewed half-month grid, byte-compatible with today's `data.js`. Converting
hand-reviewed grids into inferred offsets is a lossy, underdetermined inversion
that would inject derivation error into the one layer the override model swears
is authoritative — and it would make "Carrboro must not move" nearly impossible
to guarantee. Verbatim carriage makes that regression gate hold **by
construction**, drops the risky grid→offset migration off the critical path
entirely, and matches how Extension calendars are actually published (date
tables, not offsets). Packs are region-locked by definition, so they don't need
portable rules; only the computed layer does. Timing is therefore a union:
`{ kind: "verbatim", grid } | { kind: "anchored", events }`.

Half-months remain the **rendering currency** in both cases: verbatim grids pass
through unchanged; anchored/computed windows are bucketed into the same 24 slots.

**Year-wrap pin (part of this contract):** computed windows live on an
**unbounded season-day axis** (days since Jan 1 of the plan year, allowed to
exceed 366) — garlic planted in October is harvested the following June, and an
overwinter sowing's derived harvest lands in the next calendar year. Normalize
modulo the year only at render time; never do modular interval arithmetic
mid-computation.

**Cost of getting it wrong:** retrofitting multi-season + day precision (or
cross-year semantics) onto a grid-shaped corpus of packs is a full re-encode.

---

## D3. A shared crop catalog with stable slugs — packs key by slug, never by ordinal id ⭐

Today `id` is a per-file ordinal (`1…90`). The moment a second pack exists,
"crop #47" is meaningless — two packs, the computed engine, and the override
resolver all need to agree that *this row* and *that row* describe **the same
crop** in order to merge or override.

**Decision:** a **global crop catalog** with stable, human-readable slugs
(`tomato`, `lettuce-leaf`, `pea-snap-pole`) holding the crop's identity —
botanical name, category, method variants (direct/transplant), and the
**structured** days-to-maturity (D4). Packs and computed rows key by slug and
carry only *timing + regional prose*. Varieties/cultivars stay **in the pack**
(they're regional: Dano lettuce, Chandler strawberry) — not in the global
catalog.

**Cost of getting it wrong:** change crop identity after packs ship and *every*
pack's rows fail to resolve. This is among the cheapest to do now and among the
most destructive to defer.

---

## D4. Structure days-to-maturity now — the fall-planting math and crop filter both need it

`daysToHarvest` is free text today: `"40-50"`, `"T = 45-60, S = 70-85"`,
`"60-70, 42-56"`, `**` footnotes. Two core features are impossible on free text:

- **Fall planting counts backward** from `firstFrost` by days-to-maturity (plus a
  short-day fudge). Without numeric DTH per method, the computed engine can't
  place fall crops at all.
- **Crop-applicability filter** (does a 90-day melon fit a location's frost-free
  window?) needs numeric ranges and the growing season length.

**Decision:** model DTH as structured data on the crop catalog —
`{ direct: [min,max], transplant: [min,max], note }` — and parse the existing
free-text once during the Piedmont migration. Do it before there are many packs;
normalizing free text across N contributor packs later is drudgery that never
fully converges.

---

## D5. The pack schema & precedence semantics — the contract every future pack signs ⭐

Once contributors write packs, the schema calcifies. Decide the whole contract
upfront, even the parts you won't exercise for months:

- **Merge granularity = per-crop, with optional per-field override.** A partial
  pack overrides just `tomato` and `pea-snap-pole` and lets the rest compute; it
  may override *dates* while inheriting *prose*, or vice-versa. Encode
  "intentionally omits" distinctly from "inherits."
- **Overlap resolution = most-specific footprint wins, and specificity is
  *derived*, not hand-picked.** A county pack beats a state pack beats the
  computed layer. Derive precedence from the footprint itself (counties >
  polygon > bbox, then smaller area wins) so contributors can't collide by all
  choosing the same magic number; keep a manual field only as a tie-breaker.
- **Footprint geometry is a required field from day one.** A pack declares
  *where it applies* as geometry (simplified polygon / county set / bbox); the
  resolver does point-in-polygon. Keying packs by hardiness zone alone is a
  trap — "8a" spans the NC Piedmont and coastal Oregon, and Carrboro straddles
  7b/8a (the compare-script header already says so).
- **Provenance + confidence are mandatory per overriding row** — the existing
  `PLANT_REVIEW_CONFIDENCE_SCORES` / `REVIEW_SOURCE_LIBRARY` become required
  schema fields, not optional extras (see D8).
- **The pack declares a `schemaVersion`.** Cheap now; lets the resolver evolve
  without a flag day. Painful to retrofit onto version-less packs.

**Cost of getting it wrong:** a schema migration coordinated across every
contributor pack — the migration nobody wants to run.

---

## D6. A data-provider interface — the hedge for client-vs-server, CORS, and data size

The app is a static offline PWA today, and staying client-side-first is the
right default (no keys, no backend, offline intact). But three realities push
back: NCEI station normals are large, SSURGO **can't** be shipped whole and
isn't CORS-enabled, and live weather must be fetched at runtime.

**Decision:** put **every** external data access behind a narrow provider
interface — `FrostProvider`, `ZoneProvider`, `SoilProvider`, `WeatherProvider` —
each `(lat,lng) → typed result`. Ship the phase-1 implementations as
static-JSON-backed client providers; keep the *option* to move any one of them
behind a tiny serverless proxy later **without touching the engine, resolver, or
UI**. The one-way door is not the hosting choice — it's *scattering `fetch()` and
dataset assumptions through the codebase*. The interface is the reversibility.

Two signature pins that make the seam real (added after review):

- **Every provider method is async**, even ones a static-JSON impl could answer
  synchronously — a seam whose signatures forbid the network impl isn't a seam.
- **Providers assemble a `SiteContext` that is plain serializable data** (a
  frost-date *table*, not closures). No functions in the context: it must be
  cacheable in `localStorage` for offline PWA use and snapshottable as a test
  fixture. The engine/resolver stays pure and synchronous over that context.

**Deliberately deferred behind this seam:** the actual serverless proxy, the
SSURGO fetch-and-cache, and the live-weather layer. Decide the seam now, build
the implementations when their phase arrives.

---

## D7. Canonical location = lat/lng bundle; ZIP is an input, not the key

Everything keys off location, so its canonical form is a one-way door.

**Decision:** ground truth is `{lat, lng}` (from ZIP centroid or geolocation),
resolved into a bundle: `{ zone, regionId, frostStation + distanceKm,
soilSummary }`. Make **lat/lng canonical, ZIP merely one input method.** Keying
on ZIP locks you to US-only, coarse centroids, and no path to finer precision or
(hypothetically) other countries. Scope stays **US-only now** (NCEI/USDA/SSURGO
are US) — but lat/lng keeps that door merely closed, not welded.

**Cost of getting it wrong:** packs, station lookup, and caching all key off the
location identity; changing it is a core rewrite.

---

## D8. Provenance & uncertainty as a data + UX contract — computed is never dressed as curated

This is partly an ethics-of-the-domain decision: wrong planting advice costs a
gardener a season, so the system must be honest about what it knows.

**Decision, three pins:**

1. **Computed ≠ curated, always visibly.** A calendar assembled from national
   data is labeled an *estimate*; a hand-reviewed pack row shows its confidence
   and sources. The confidence score becomes the resolver's honesty signal, not
   decoration.
2. **Express uncertainty, don't fake precision.** Surface frost as a
   *probability/range* (NCEI gives 10–90%), not a single date. Retrofitting
   honesty into a UI that promised single dates is rework plus a trust hit.
3. **Pin dataset versions.** Record which NCEI normals epoch / USDA zone map /
   SSURGO snapshot produced a calendar. When the 2021–2050 normals land, you
   migrate deliberately instead of silently shifting everyone's dates.

**Cost of getting it wrong:** a trust problem and a UI/data rework, both hard to
walk back after users have relied on the numbers.

---

## D9. Language & stack trajectory (soft one-way door): TypeScript, one runtime, Python only at build time

Judge every language/stack question by one test: **does it make the contracts
(D1–D5) safer, or does it just move the plumbing around?** The hard part of this
project is the data model, not the view.

- **Adopt TypeScript — the highest-leverage change.** It is not "a different
  language," it is the *enforcement layer* for D1–D5: a pack that violates the
  schema, an offset with the wrong anchor, or a crop row missing structured DTH
  becomes a **compile error** instead of a runtime surprise a contributor finds
  in production. Migrate incrementally; it still ships JS and keeps the PWA/offline
  story intact.
- **Turn data into data.** Today `data.js` is executable globals loaded via
  `<script>` and eval'd with `vm` in `compare-ncsu.mjs`. A multi-pack corpus
  wants **JSON (validated by the TS types) loaded deliberately** — better for PWA
  caching, offline, and testing. Plan the migration target now.
- **Add modules + a real test harness; keep vanilla rendering.** The offset
  engine and resolver are pure logic that *must* be unit-tested — the top
  regression is **"Carrboro's calendar must not move"** when the Piedmont pack is
  re-expressed. Generalize the `compare-ncsu.mjs` pattern into that gate.
- **Resist a frontend framework (for now).** The UI is a grid + a panel; it is
  not the hard part, and the app's simplicity is a feature. The *only* thing that
  later justifies a small reactive layer is if a map-based location picker plus
  multiple data overlays make manual DOM sync bug-prone — and then reach for
  **Svelte / Solid / Preact signals**, not React. Two-way door; decide it when
  the interactivity arrives, not now. **No WASM/Rust/Go on the front end** — the
  compute is microseconds in JS; there is no performance problem to solve.
- **Stay backendless; keep one runtime language.** The provider interfaces (D6)
  mean Phase 1–2 needs no server. When a runtime proxy *is* needed (SSURGO isn't
  CORS-enabled), make it a **TypeScript edge function** so it shares the schema
  types with the packs and engine. Introducing a second *runtime* language
  fragments the contracts — don't.
- **The one legitimate polyglot boundary: the offline data-ETL pipeline.**
  Crunching NCEI normals (netCDF), USDA zone rasters, and simplifying pack
  polygons into shipped JSON is genuinely better in **Python** (`xarray`,
  `geopandas`, `shapely`, `rasterio`). That is *build-time, not runtime* — it
  emits JSON the TS types then validate, so it never touches the live contracts.
  A clean boundary, not fragmentation.
- **Don't rewrite for its own sake.** The vanilla-JS app is small and works. The
  migration that pays off is **data-as-data + TypeScript, incrementally** — a
  framework or new runtime would be motion, not progress.

---

## What to deliberately NOT decide now (two-way doors — don't over-invest)

- **Live weather layer** (NWS/Open-Meteo overlays) — behind `WeatherProvider`
  (D6); build in its phase.
- **Serverless proxy / SSURGO-at-scale** — behind `SoilProvider`; static-first
  until a real limit is hit.
- **Microclimate personalization** (raised beds, tunnels, a user's own frost
  log). Big future surface — but D1's anchors-as-parameters already leaves room
  for a user-nudged frost date. Allow it in the model; don't build it.
- **International.** Out of scope; D7's lat/lng keeps the door from welding shut.
- **Ornamentals / lawn / trees.** The offset model fits annuals + season-timed
  fruit; don't stretch it now.
- **Framework / SPA rewrite.** Explicitly not planned.

---

## The sequencing insight: force the seams with N=2 before scaling

Single-pack abstractions are always wrong, because nothing pushes back on them.
The cheapest way to validate every decision above is to **stand up a second
region immediately** — even a rough, purely-computed one (say, a short-season
northern zone) — so the resolver, crop catalog, anchor vocabulary, pack schema,
and providers are all exercised by **two** consumers from day one, not one.

Suggested first milestone (**Phase 1.0 — the skeleton**), in dependency order
(revised: verbatim carriage moves the Piedmont migration off the risky path):

1. Crop catalog + structured DTH (D3, D4) — extracted from today's data.
2. **Loader**: mechanically translate `data.js` into **Piedmont pack #1 with
   verbatim timing** (D2/D5). Regression gate — output grid identical to
   `data.js` — holds by construction and is asserted by a golden test.
3. Anchor vocabulary + offset engine (D1, D2), pure and unit-tested with
   `node:test` — golden tests for anchored crops (e.g. spinach) at fixture
   sites, including the cross-year season-day cases (garlic, overwinter sows).
4. `FrostProvider` + `ZoneProvider` as static-JSON client providers (D6, D7),
   assembling a serializable `SiteContext`.
5. Resolver + **one computed second region** to prove override-vs-computed.
6. **Runtime pack validator** — TS types only protect TS-authored packs;
   contributor packs arriving as JSON need schema validation at load time.

Only after that skeleton holds two packs do you scale: more packs, `SoilProvider`
prose, the live-weather layer, personalization.

---

## Decision log (the upfront commitments)

| # | Decision | Recommendation | Reversibility |
|---|---|---|---|
| D1 | Anchor vocabulary & frost semantics | Small fixed set; frost = threshold+probability parameter | One-way ⭐ |
| D2 | Canonical timing shape | Union: curated packs may carry the reviewed grid **verbatim**; anchored day-resolution events for computed + opt-in packs; unbounded season-day axis for cross-year crops; half-months are render-only | One-way ⭐ |
| D3 | Crop identity across packs | Global catalog, stable slugs; varieties stay in packs | One-way ⭐ |
| D4 | Days-to-maturity | Structured numeric per method | Hard to reverse |
| D5 | Pack schema & precedence | Per-crop+field merge; most-specific footprint wins; provenance + `schemaVersion` required; geometry from day one | One-way ⭐ |
| D6 | External data access | Provider interfaces, all-async signatures; providers assemble a plain-data serializable `SiteContext`; static-client first, proxy optional | Seam one-way, impl two-way |
| D7 | Location identity | lat/lng canonical; ZIP an input; US-only now | One-way |
| D8 | Provenance & uncertainty | Computed≠curated labeled; probabilities not dates; pin dataset versions | Hard to reverse |
| D9 | Language & stack | TypeScript as the contract layer; one runtime (TS, incl. any proxy); Python only for build-time ETL; data-as-data + tests; no framework/WASM now | Soft |

**The through-line:** pin D1–D5 (the five seams) before writing a second pack;
treat D6–D9 as directions with escape hatches; and prove the whole thing with
**two** regions before scaling to many.
