# Additional Data Sources: Beyond Frost & Zone

_The frost/zone/soil/weather stack answers one question — "when is it warm or
cold enough." This note catalogs data sources that answer **different**
questions the current calendar can't, ordered by how much they'd change the
product. All are free, US-government / open, and fit the existing provider-seam
architecture._

## The framing: what our data does and doesn't answer

| Question | Answered today? | By what |
|---|---|---|
| When is it warm/cold enough to plant X? | ✅ | NCEI frost normals + engine |
| What can survive winter here? | ✅ (partial) | USDA hardiness zone |
| What's my soil like? | 📋 planned | SSURGO |
| **Is this year early or late?** | ❌ | — everything is 30-yr *averages* |
| **When are pests/diseases active?** | ❌ | — TASKS notes are static & Carrboro-only |
| **Will it be dry? Should I water?** | ❌ | — no precipitation dimension at all |
| **What should I plant for pollinators / what's native?** | ❌ | — |

The current calendar is built entirely on **climate normals — 30-year
averages**. That's the right foundation, but it means the calendar is *static*:
it says the same thing in an early spring and a late one. The single most
valuable category below fixes exactly that.

## The standout: phenology makes the calendar responsive to the actual year ⭐

**USA National Phenology Network (USA-NPN).** Openly available maps + data.

- **Spring Indices** (Spring Leaf / Spring Bloom Index) — a daily, 2.5 km
  gridded measure of *whether spring has arrived early or late this year*
  versus the long-term average, as a day-anomaly. This is the missing dynamic
  layer: our whole calendar hangs off average frost dates, but USA-NPN can say
  "spring is running 11 days early at your location this year" — which could
  shift every spring-anchored window accordingly, with an honest "adjusted for
  an early spring" badge. It turns a reference table into a living calendar.
- **Pheno Forecasts** — 6-day, daily-updated, 2.5 km forecasts of life-stage
  timing for **12 insect pests + invasive species** (emerald ash borer, apple
  maggot, lilac borer, hemlock woolly adelgid, winter moth, …), based on
  published growing-degree-day thresholds. This directly upgrades the static,
  Carrboro-only pest-scouting lines in the `TASKS` chore calendar into
  location- and year-specific alerts: "apple maggot control window opens in
  your area this week."

Why it fits: it's GDD-based, and the engine already has a `gddAccum` anchor
kind reserved (currently a gate, not yet resolvable). Phenology is the natural
reason to make GDD a first-class resolvable anchor — and unlike the others it
adds a *time* dimension (this year, this week) the product completely lacks.

## Strong complements

**NOAA/NCEI precipitation normals** — *the cheapest high-value add.* The same
NCEI 1991–2020 product we already fetch for frost also carries monthly
precipitation normals at the same stations. Near-zero incremental ETL, and it
enables a whole water dimension: "your area averages 4.1″ of rain in July —
these crops will need supplemental irrigation." Pairs naturally with the
existing "deep water 1″/week" style notes.

**US Drought Monitor (drought.gov)** — public JSON API, weekly updates, by
point/county. Current-conditions ("you're in D2 severe drought") rather than
climatology, so it's a *live* layer: prioritize drought-tolerant crops, flag
water restrictions season. Good honesty pairing with precipitation normals
(normal vs. this-year).

**USDA PLANTS Database** — native / introduced / invasive status and
distribution by state, plus pollinator associations. Enables a "beneficial
garden" expansion: mark which flowers in the catalog are native to the user's
region, surface pollinator plants, and *warn* before recommending something
invasive in their state. Adjacent to the core calendar but a natural fit with
the existing flower rows and the deer-resistant-flower touch already in the UI.

## Lower priority / speculative

- **USGS 3DEP elevation (EPQS)** — already noted in the original research;
  elevation + aspect for frost-pocket microclimate. Marginal gain, real
  complexity.
- **AirNow / wildfire smoke** — increasingly relevant in the West for "should I
  be outside / will seedlings get light," but a stretch for a planting calendar.
- **iNaturalist / GBIF occurrence data** — "what actually grows near here" from
  citizen science; interesting long-term signal-blending idea (ties to the
  community-signals vision) but noisy and not calendar-critical.

## Architecture fit

Everything slots behind the existing provider seams (D6) with the same
static-vs-live split we've already committed to:

| Source | Cadence | Bake as shards (static) or fetch live? |
|---|---|---|
| Precipitation normals | 30-yr, fixed | **Static** — extend the NCEI ETL, ship in the frost tiles |
| USDA PLANTS (native/pollinator/invasive) | ~stable | **Static** — bake a per-state lookup |
| USA-NPN Spring Index anomaly | daily | **Live** `PhenologyProvider` (graceful offline fallback to normals) |
| USA-NPN Pheno Forecasts (pests) | daily, 6-day | **Live** |
| US Drought Monitor | weekly | **Live** |

The live ones follow the exact pattern already designed for NWS/Open-Meteo:
keyless where possible, CORS-permitting or a thin proxy, and **degrade to the
static normals when offline** so the PWA never breaks. Honesty rules carry over:
a phenology-adjusted date is labeled as adjusted; drought status shows its
as-of date; native/invasive claims cite USDA PLANTS.

## Recommendation & sequencing

1. **Precipitation normals** — trivial extension of the NCEI ETL, immediate
   water-guidance value, no new live infrastructure. Do it alongside any NCEI
   re-run.
2. **USA-NPN Spring Index** — the highest-*impact* item: it makes the calendar
   respond to the real year, which nothing else here does. Bigger lift (live
   provider + making `gddAccum` a resolvable anchor), so it's the flagship
   next-data project rather than a quick win.
3. **US Drought Monitor + Pheno Forecast pests** — live "what's happening now"
   layer; natural companions to #2 and to the planned NWS/Open-Meteo weather
   work (they're all the same live-overlay pattern).
4. **USDA PLANTS (native/pollinator/invasive)** — a distinct "beneficial
   garden" feature track; static, do whenever it's the priority.

The theme: we've built an excellent **static climatology** engine. The most
interesting frontier is adding a **temporal** layer — phenology and current
conditions — that tells a gardener not just what month, but whether *this* year
is early, whether the pests are out *this* week, and whether it's too dry *right
now*.

### Sources

- [USA-NPN Pheno Forecasts](https://www.usanpn.org/data/maps/forecasts) · [USA-NPN Models & Maps](https://www.usanpn.org/data/maps) · [pest life-stage forecast background](https://entomologytoday.org/2020/02/11/usa-national-phenology-network-aids-management-pest-insects-life-stage-forecast-maps/)
- [US Drought Monitor / drought.gov data](https://www.drought.gov/data-maps-tools/us-drought-monitor) · [drought.gov county data](https://www.drought.gov/county/data)
- [USDA PLANTS Database](https://plants.sc.egov.usda.gov/home) · [native pollinator plants by USDA region (PDF)](https://www.usda.gov/sites/default/files/documents/native-pollinator-plants-infographic.pdf)
- [NOAA/NCEI U.S. Climate Normals (incl. precipitation)](https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals)
