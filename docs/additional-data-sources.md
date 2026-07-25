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

## The "Now" view — the surface that makes temporal data pay off ⭐

Think of it as two products from one engine:

- The **calendar** = the whole year, a *reference* (what we have today).
- The **"Now" view** = this moment, a *dashboard*: "here's what to do at your
  site in the next ~2 weeks, and what's closing soon."

**Why it's the linchpin, not just another feature:** the temporal data sources
above are *invisible on a static year-grid*. "Spring is 11 days early" does
nothing to a table of all twelve months; "apple maggot is active this week" has
nowhere to land. They only become meaningful on a surface that asks *what do I
do now* — and conversely, a Now view is already useful on today's static data,
with no new sources at all. So the Now view is the **frame every temporal source
plugs into**, and it should come first.

**Cheap to build on the current engine.** The engine already emits
`ResolvedWindow[]` on a season-day axis. A Now view is a pure selector over
that: filter to windows overlapping `today ± N days`, group by activity (sow
indoors / transplant / direct-sow / harvest), and flag windows *ending soon*
(the highest-value nudge — those are the ones you can miss). No new data
required for v1; it's mostly a selector + a screen.

**Then each temporal source lights up a row in it** — attached as an advisory to
the relevant action, not a separate panel:

| Source | How it shows up in the Now view |
|---|---|
| USA-NPN Spring Index | shifts *what counts as "now"* — "spring is early; these windows moved up ~11 days" |
| NWS frost/freeze alert | "❄️ freeze tonight — hold tender transplants, cover blooms" on the affected actions |
| USA-NPN pest Pheno Forecast | "🐛 scout for apple maggot — control window open this week" |
| US Drought Monitor | "you're in D2 — prioritize watering; hold thirsty transplants" |
| Open-Meteo soil temp | turns "wait for 60°F soil" into a live ✅/⏳ on tomato/pepper set-out |
| Precipitation normal | "dry stretch typical now — water new sowings" |
| Photoperiod | "Persephone period starts Nov 18 — last window for fall greens" |

Honesty and offline behavior carry over unchanged: computed rows stay marked,
adjusted dates say "adjusted for an early spring," and the view works offline
from the static calendar, enriching when live sources are reachable. It's also
the natural home for the personal frost-date overlay (Stage A — "based on *your*
frost date") and, later, a weekly digest ("your week in the garden").

## Recommendation & sequencing

The Now-view insight reorders this: build the **frame** first, then light it up.

1. **The "Now" view (static v1)** — build it on today's data, no new sources.
   Cheap (a selector + a screen over the engine's existing windows), immediately
   useful, and it's the surface everything below plugs into. Do this first.
2. **Precipitation normals** — trivial NCEI-ETL extension; adds the first
   advisory row (water guidance) and a whole climatic dimension for near-zero
   cost.
3. **USA-NPN Spring Index** — the highest-*impact* source: it makes "now" itself
   respond to the real year. Bigger lift (live `PhenologyProvider` + promoting
   `gddAccum` to a resolvable anchor), so it's the flagship once the frame
   exists.
4. **US Drought Monitor + Pheno Forecast pests + NWS/Open-Meteo** — the live
   "what's happening now" overlays; all the same pattern, each one more advisory
   row in the Now view.
5. **USDA PLANTS (native/pollinator/invasive)** — a distinct "beneficial garden"
   track; static, do whenever it's the priority.

The theme: we've built an excellent **static climatology** engine. The frontier
is a **temporal** layer — and the "Now" view is what turns that layer from data
into action: it tells a gardener not just what month, but whether *this* year is
early, whether the pests are out *this* week, and whether it's too dry *right
now*.

### Sources

- [USA-NPN Pheno Forecasts](https://www.usanpn.org/data/maps/forecasts) · [USA-NPN Models & Maps](https://www.usanpn.org/data/maps) · [pest life-stage forecast background](https://entomologytoday.org/2020/02/11/usa-national-phenology-network-aids-management-pest-insects-life-stage-forecast-maps/)
- [US Drought Monitor / drought.gov data](https://www.drought.gov/data-maps-tools/us-drought-monitor) · [drought.gov county data](https://www.drought.gov/county/data)
- [USDA PLANTS Database](https://plants.sc.egov.usda.gov/home) · [native pollinator plants by USDA region (PDF)](https://www.usda.gov/sites/default/files/documents/native-pollinator-plants-infographic.pdf)
- [NOAA/NCEI U.S. Climate Normals (incl. precipitation)](https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals)
