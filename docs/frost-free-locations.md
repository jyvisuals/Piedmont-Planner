# Accounting for Frost-Free Locations (Heat-Regime Gardening)

_The computed engine currently **refuses** near-frost-free sites (the desert
guard) — honest, but a Phoenix gardener still gets no calendar. This documents
how frost-free planting timing actually works and how to model it, since the
answer maps cleanly onto the existing anchor architecture._

## The research: what replaces frost

In frost-free climates the limiting wall is **heat, not cold**. Every source
converges:

- **The 86°F threshold is the heat analog of the frost line.** The AHS Plant
  Heat Zone Map counts "heat days" (daily high > 86°F) because that's where
  photosynthesis slows and heat damage begins. 12 zones, mappable by ZIP —
  structurally identical to USDA hardiness zones, just for heat.
- **Secondary heat rule:** nighttime lows above ~70°F halt fruit set (tomatoes,
  peppers stop producing), so warm crops must mature *before* deep summer.
- **The low desert is a two-season calendar split by summer heat:** cool-season
  crops Sept–Jan (they'd bolt/die May–Aug), warm-season crops Feb–May with a
  second short fall shoulder. Gardeners "work within narrow windows between frost
  danger and extreme summer heat."
- **Soil temperature** gates warm-crop germination (already an anchor we reserve).

## The unifying model: "two walls"

Frost and heat are the same idea — a **seasonal wall** the crop must avoid. A
site has up to two walls, and plantable windows are the gaps between them:

| Site type | Cold wall (frost) | Heat wall (86°F) | Plantable windows |
|---|---|---|---|
| **Temperate** (Piedmont, N. Missouri) | yes | no | one: spring→fall (current model) |
| **Low desert / subtropical** (Phoenix, S. Florida) | no | yes | cool season around winter; warm crops in spring + fall shoulders |
| **Double-walled** (Tucson, inland CA, high desert) | yes | yes | narrow shoulders between winter frost and summer heat |
| **Mild maritime** (coastal CA, Hawaii uplands) | no | no | ~year-round; anchor to day length / calendar |

Each **crop** is keyed to which wall it flees:
- **Cool-season crops** (lettuce, spinach, brassicas, peas) avoid the *heat* wall
  → in a heat regime they grow through the cool season (fall→spring).
- **Warm-season crops** (tomatoes, peppers, squash, beans) avoid the *frost* wall
  → in a heat regime they *also* dodge peak heat, giving **two** windows: a
  spring planting before the heat wall and a fall planting after it.

This is exactly our existing frost model, generalized: today we anchor to
`lastFrost`/`firstFrost`; the desert anchors to `heatOnset`/`heatRelief`.

## How it maps onto our architecture (the good news)

The anchor vocabulary (D1) already anticipated this — adding heat is additive,
not a redesign:

1. **New anchors:** `heatOnset` (spring crossing above 86°F, probability-
   parameterized) and `heatRelief` (fall crossing back below) — identical shape
   to `FrostAnchorRef` (threshold °F + probability). The whole frost-relative
   engine (offsets, two-anchor succession windows, season-day axis) works
   unchanged against them.
2. **Site regime detection:** from the site's frost-free span *and* heat data,
   classify temperate / desert / double-walled / mild (the "two walls" table).
   The `frostRegimeApplies()` guard becomes one branch of a regime classifier.
3. **Crop "limiting factor" signal:** a catalog flag — `coolSeason` vs
   `warmSeason` (most crops already implied by `hardiness`) — tells the rules
   which wall each crop flees, so the desert branch can place cool crops in
   winter and warm crops in the spring/fall shoulders.
4. **Computed rules branch by regime:** temperate → today's frost-anchored rules;
   heat regime → heat-anchored rules (cool crops around winter; warm crops
   `heatOnset − maxDTH … heatOnset` in spring and `heatRelief … firstFrost/end`
   in fall).

## Data: where heat-onset/heat-relief dates come from

Parallel to the NCEI frost tiles:

- **Derive first/last 86°F (and 90/95°F) crossing dates** from gridded daily
  climate normals — PRISM, Daymet, or Open-Meteo climatology — as a build-time
  ETL producing **heat tiles** alongside `app/data/frost/`. This is the clean,
  precise source and reuses the exact tiling/lazy-load machinery already built.
- **AHS heat zone (days > 86°F) by ZIP** — a coarse fallback / sanity layer, the
  heat analog of the hardiness-zone shard.
- Night-warm (>70°F) onset can come from the same daily normals for the
  fruit-set rule, later.

## Honesty & scope caveats

- Heat-regime timing is **more variety- and microclimate-sensitive** than frost
  timing (shade cloth, planting-date nudging, and heat-tolerant varieties shift
  windows a lot). Start conservative and keep the "est." labeling.
- The double-walled case has the **narrowest, least-forgiving windows** — the
  place to be most cautious and most explicit about uncertainty.
- Extension calendars remain the gold standard here (U of A az1005, UF/IFAS
  Florida); a curated desert pack would beat any computed heat model, same as
  the Piedmont pack beats computed in the temperate case.

## Recommended phasing

1. **Better refusal → context (small).** Replace the blunt "we can't help here"
   with the heat-zone + season framing: "You're in a heat-regime climate; plant
   cool crops in winter, warm crops in spring/fall shoulders — here's your local
   extension calendar." Ships value immediately, no new data.
2. **Heat anchors + heat tiles (the real build).** Add `heatOnset`/`heatRelief`
   anchors, the heat-tile ETL, regime classification, and the heat-regime
   computed branch. This is the frost work mirrored — the architecture is ready.
3. **Double-walled shoulders + night-warm fruit-set rule (refinement).**
4. **Curated desert pack** (Phoenix/Maricopa from az1005) — the heat-regime
   analog of the Piedmont pack, and the most accurate option for that region.

The through-line: **frost-free isn't "no season" — it's a heat-bounded season.**
Our frost-relative engine already knows how to plant against a wall; it just
needs a second kind of wall.

### Sources

- [AHS Plant Heat Zone Map — how to read it (Fine Gardening)](https://www.finegardening.com/article/how-to-read-and-use-the-ahs-heat-zone-map-for-gardening) · [heat zones & plant health (US Botanic Garden)](https://www.usbg.gov/blog/heat-zones-plant-health-and-ahs-heat-zone-map) · [heat zone by ZIP (plantmaps)](https://www.plantmaps.com/interactive-florida-heat-zones-map.php)
- [Low-desert Arizona planting calendar (Growing in the Garden)](https://growinginthegarden.com/planting-calendar-for-the-low-desert-of-arizona/) · [U of A az1005 (Maricopa County)](https://www.extension.arizona.edu/sites/default/files/2024-08/az1005-2018.pdf)
