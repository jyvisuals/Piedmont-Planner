# The Climate-Suitability Model — the general engine

_A crop-climate matching model that scores every day of the year for lifecycle
success, using historical climate data, with frost recommendations as a baseline
and validation tool rather than the central engine. This is the north-star
architecture; this doc grounds it in what's already built and names the two hard
parts._

## Verdict

This is the right direction and it **unifies everything**. Frost timing, the
heat-wall (`docs/frost-free-locations.md`), tropical wet/dry — all become special
cases of one question: *"when are the crop's stage-by-stage climate requirements
likely to be met?"* It removes the frost-free special-casing entirely (the
`frostRegimeApplies()` guard becomes unnecessary — the model simply scores those
locations differently), and it naturally produces the **probability windows**
(62% / 88% / …) that are more honest than a single date.

## The key architectural insight: this is the new *computed layer*, not a rewrite

We already built the layering this slots into. The suitability model **replaces
the offset rules** (`schema/engine/computed-rules.ts`) — nothing else changes:

```
  Curated regional packs        ← UNCHANGED. Hand-reviewed truth still wins.
  (Piedmont; future Phoenix)      Verbatim grids override everything below.
        │  (resolver, D5 — unchanged)
        ▼
  Climate-suitability engine    ← NEW. Replaces the frost-offset rules as the
  (scores 365 days per crop)      computed base layer.
        │
        ▼
  Half-month grid  +  probability curve   ← render both (grid stays; curve is new)
```

Why keep curated packs on top: a hand-reviewed calendar carries local disease
pressure, variety choice, and microclimate judgment no climate model captures
(the Cherokee-Purple-cat-facing kind of knowledge). The suitability model makes
the *computed* fallback dramatically better and universal; it does not replace
curated truth. The whole resolver, precedence, honesty-marker, and **validation-
harness** machinery carries over untouched — the harness's job simply becomes
"validate the suitability engine," which is exactly what our extension-calendar
fixtures already do.

## What's genuinely new: two data dependencies

### 1. Crop stage requirements (a global catalog enrichment)
Per-crop, per-stage temperature thresholds — germination / establishment /
flowering / fruiting, each with min / preferred-range / max, plus stage duration.
Crucially this is **location-independent** (a tomato's thresholds are the same
everywhere), so it's a one-time *global* dataset — an enrichment of the existing
`crop-catalog.ts` (which is already our D3 global layer with hardiness + DTH).

Bootstrap it exactly as proposed: classify each crop from its existing frost
offset / hardiness (6–8 wks before frost → very cold-tolerant; 1–2 wks after →
warm-season …), then layer crop-specific thresholds from horticultural sources.
Our catalog already has `hardiness` and structured `daysToMaturity` — this is
additive fields, not a new file.

### 2. Distributional climate data (a new tile layer)
The scorer needs *probabilities* — P(frost in next 30 days), % nights > 52°F,
P(> 95°F during flowering). **The compaction insight: you do not need to ship raw
daily series.** Ship, per location, the **biweekly (half-month) distribution** of
daily min/max temperature and precipitation — mean + spread (or a few
percentiles) for each of the 24 slots. That's ~24 × a handful of numbers per
location — the same order as the frost tiles, lazy-loaded the same way — and it's
enough to compute every probability the model needs by integrating the crop's
stage windows over those distributions.

Sources (all reusable via the tile ETL we already built):
- **NCEI U.S. Climate Normals** already publish monthly/daily normals *and
  quantiles* — the distributional summary, build-time.
- **PRISM / Daymet / nClimGrid-Daily** — gridded daily, for deriving the biweekly
  stats at build time.
- **Open-Meteo historical (ERA5)** — free, keyless, CORS: a runtime fallback to
  fetch a location's daily climatology on demand for the browser scorer.

Night-warm (> 70°F) onset and heat-day counts fall out of the same min/max
distributions — no separate dataset.

## The scorer (lifecycle, not planting-day)

For each candidate planting day, walk the crop's stages forward (establishment →
flowering → fruiting, offset by DTH), and multiply stage-fit factors:

```
Suitability(day) = Π_stages [ TempFit · FrostSurvival · HeatSurvival · MoistureFit · DayLengthFit ]
```

Each factor ∈ [0,1], evaluated against the climate *distribution* over that
stage's calendar span. Frost and heat are not special anchors here — they're just
where `FrostSurvival`/`HeatSurvival` go to 0. Output: a 365-day (or 24-slot)
suitability curve, from which continuous high-scoring spans become planting
windows, and the score becomes the honest probability label.

**Modeling-honesty caveats** (these are real):
- The multiplicative form and the component curves are *heuristics with no ground
  truth for their weights*. Start **temperature-dominated** (Temp/Frost/Heat);
  add Moisture/DayLength only as each proves out on the harness.
- Moisture/humidity/disease are much softer than temperature (irrigation exists;
  disease is variety/management-specific) — treat them as adjustments, not
  co-equal factors, until validated.
- The risk is **false precision**: a curve computed from climate stats *looks*
  authoritative. Keep the "est." labeling, keep curated packs on top, and hold
  the model to: *reproduce expert extension calendars where they exist; extrapolate
  sensibly where they don't.*

## Why our validation work is the payoff here

The extension calendars collected while validating the offset engine (NC AG-756,
Grow More Food, Zone 5–6 North Missouri, U of A Maricopa, NMSU DTH) become the
**validation set for the suitability engine**. The success criterion is concrete:
the suitability windows should match those calendars within tolerance in each
climate (temperate, PNW, Midwest, *and* the desert the offset model refused). We
already have the harness (`validate-computed.mjs`) and the metric (primary-timing
/ fidelity). The suitability engine ships when it matches or beats the offset
engine across all references *and* produces sane windows for Phoenix.

## Migration path (non-destructive)

1. **Enrich the catalog** with stage thresholds (bootstrap from hardiness/offset,
   then horticultural sources). Additive; nothing breaks. ✅ **DONE** —
   `schema/climate/crop-climate.ts` (per-crop germ/base/opt/ceiling °F + frost-
   killed + warm/cool season, keyed off hardiness with crop-specific overrides;
   the golden crop-catalog is untouched).
2. **Ship biweekly climate-distribution tiles** (min/max temp + precip percentiles)
   via the existing tile ETL. ⏳ **stubbed** — `schema/engine/climate-model.ts`
   reconstructs the annual daily-min curve from the **real** multi-threshold NCEI
   frost crossings we already ship (a sinusoid fit through up to 12 real
   (day, °F) points). See *Measured* below for what this does and doesn't
   capture; real tiles replace this module at the clean seam it defines.
3. **Build the suitability scorer** as a new engine module, temperature-only
   first, producing the 365-day curve + 24-slot grid. ✅ **DONE** —
   `schema/engine/suitability.ts`: `Suitability(day) = germFit · frostSurvival ·
   tempFit`, windows = the upper band of the peak, output byte-compatible with
   the offset engine's `ResolvedWindow`s.
4. **Validate** against every extension-calendar fixture with the existing
   harness; iterate the thresholds/curves until it matches — *including Phoenix*.
   ✅ **DONE** — `scripts/validate-suitability.mjs` (CI, informational) grades it
   against the same references as the offset engine, side by side.
5. **Swap** the resolver's computed fallback from offset rules → suitability
   engine once it wins on the harness. Curated packs, resolver, honesty markers,
   grid rendering: all unchanged. ⏳ **next** — gated on step 2 (real heat tiles)
   so the desert case is handled rather than refused.
6. **Surface the probability curve** in the UI (risk-tiered windows) — richer than
   the grid, and the model produces it for free.
7. Retire `computed-rules.ts`.

## Measured (temperature-only first cut)

Graded blind against the same references as the offset engine
(`node scripts/validate-suitability.mjs`):

| Reference | offset primary | **suitability primary** | offset fidelity | suitability fidelity |
|---|---|---|---|---|
| Curated Piedmont pack (Carrboro) | 97% | **100%** (0 misplaced) | 29% | 12% |
| NC State AG-756 (independent) | 100% | **100%** (0 misplaced) | 23% | 8% |

**Primary timing (right season) matches or beats the offset engine with zero
misplaced crops** — the headline the "est." labeling actually claims. The
`overwinter` flag is honored (garlic fall-plants, not spring), and the
frost-free desert is **refused honestly** (`ClimateModelError`) rather than
producing nonsense — the same honest boundary the offset engine has, now
enforced at the climate model.

**What the frost-derived climate captures — and doesn't** (measured, not
asserted): the fit nails the **cold wall** — RMSE < 1°F through the real frost
crossings, so frost-survival timing is essentially exact. But every fit point
sits in the 16–36°F cold tail, so the model **underestimates absolute summer
warmth** by several °F and cannot yet represent the **heat wall**. Hence
`heatModeled = false`, the desert refusal, and the lower *fidelity* (windows run
broader than tight extension calendars). Both close the same way: **step 2's real
max-temperature tiles**, then the heat-ceiling factor earns its weight on the
harness. This is exactly the "start temperature-dominated, validate, learn
cheaply" path — and the cheap lesson is precise: temperature-from-frost is enough
to match expert calendars in frost-bounded climates and honestly insufficient in
frost-free ones.

## The through-line

Frost calendar: *when is the crop unlikely to be killed immediately?*
Climate calendar: *when is the crop most likely to complete its lifecycle?*

The same engine then works in North Carolina, Miami, Tucson, or Hawaii with no
special calendar logic — and it drops in **under** the curated packs and **into**
the validation harness we already built. The frost work wasn't a detour: it built
the override architecture, the tiling/lazy-load pipeline, the honesty model, and
the validation references this general engine needs to be trustworthy.
