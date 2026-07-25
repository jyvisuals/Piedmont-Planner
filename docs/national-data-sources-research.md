# Making Piedmont Planner National: Data-Source Research

_Research note — what it would take to turn this from a single-location (Zone 8a /
Carrboro–Piedmont NC) calendar into a tool that gives accurate recommendations
anywhere in the US, and which public US data sources make that possible._

---

## 1. Where the app is location-locked today

Everything about "when to plant" is currently baked in for one place. Concretely:

- **`data.js`** stores each crop's timing as **absolute half-month windows**
  (`feb: { half1: ["s"], half2: ["s"] }`). Those windows are only correct for a
  last-spring-frost around mid-April and a first-fall-frost around late October.
- The evidence stack is regional by construction: `REVIEW_SOURCE_LIBRARY` is
  almost entirely NC State / Clemson / UGA, `PLANT_REVIEW_NOTES` reason about
  "the Piedmont," and `scripts/compare-ncsu.mjs` cross-checks against the **NC
  State Central NC calendar (AG-756)** only.
- `TASKS` (the month-by-month chore list) hardcodes local specifics: "Send soil
  test to **NC State**," "frost protection below 25°F," "wait for 60°F soil at
  4″ before transplanting tomatoes."
- The guide notes are full of location-specific agronomy: "Piedmont clay,"
  "difficult in NC due to heat," fall peas "unreliable in the Piedmont."
- There is **no location input, no geolocation, and no runtime data fetching**
  anywhere in `script.js` — the only network call is the service-worker
  registration. The site is pure static GitHub Pages + PWA.

So generalizing is not a matter of adding a dropdown. The calendar's *anchors*
(frost dates, soil-temperature regime, day length, hardiness) are implicit
constants that have to become **inputs**.

---

## 2. The core architectural shift: from absolute dates to anchor-relative offsets

The single most important change — and the thing that makes every data source
below useful — is remodeling crop timing as **offsets relative to local
anchors** instead of fixed half-months. This is exactly how NC State (and every
multi-region planting calendar) generates location-specific dates.

For each crop activity, store the rule, not the date:

| Activity | Today (absolute) | Anchor-relative rule |
|---|---|---|
| Sow indoors (tomato) | `feb.half2` | `last_frost − 6 to −8 weeks` |
| Transplant (tomato) | `apr.half2` | `last_frost + 1 to +2 weeks` **and** `soil ≥ 60°F @ 4″` |
| Fall sow (spinach) | `aug.half2` | `first_frost − 8 to −10 weeks` |
| Overwinter (garlic) | `oct–nov` | `first_frost − 2 to +2 weeks` |

The renderer then takes a location's frost dates and **computes** the absolute
half-months. Carrboro's output stays identical to today; Minneapolis or Phoenix
produce their own calendars from the same crop rules.

Two things fall out of this:

1. **The crop *set* is also regional.** Short-season northern zones can't finish
   long-days-to-harvest crops (melons, sweet potatoes, okra) that the current
   list assumes. Generalizing means a **crop-applicability filter** driven by
   frost-free-days and hardiness zone, not just re-timing.
2. **The existing confidence/evidence scaffolding is an asset.** `PLANT_REVIEW_CONFIDENCE_SCORES`,
   `REVIEW_SOURCE_LIBRARY`, and the compare-script pattern all extend cleanly to
   a multi-source, multi-region model — you're widening a system that already
   exists, not bolting one on.

---

## 3. US data-source catalog

Ordered by how much accuracy they buy. Every source below is free and public
(government/open) unless noted.

### A. Frost / freeze dates — **the primary anchor** ⭐

- **NOAA NCEI U.S. Climate Normals (1991–2020).** The authoritative source. The
  Annual/Seasonal normals include **freeze-date probabilities** — the dates past
  which the chance of temperatures below a threshold (36/32/28/24/20/16°F) drops
  below 90/80/…/10% — for ~9,800+ stations. This is precisely the last-spring /
  first-fall anchor the calendar needs, with a probability spread you can expose
  ("50% chance after Apr 15, 10% after Apr 30").
  - Access: NCEI data-search portal, **AWS Open Data** (`s3://noaa-climate-normals/`),
    and THREDDS. There is **no clean "by-ZIP JSON" endpoint** — you preprocess
    the station normals into a table and do nearest-station (or interpolated)
    lookup by lat/long. Public domain.
  - **Fits the static model:** frost normals don't change, so bake a station
    dataset into the app as shipped JSON. No backend, still works offline.
- **Consumer wrappers** (Old Farmer's Almanac, Garden.org, Dave's Garden) all
  present NCEI data by ZIP but are **not open APIs** — don't depend on scraping
  them. Garden.org explicitly cites NCEI as its source, which confirms NCEI is
  the right upstream to use directly.

### B. USDA Plant Hardiness Zone (2023 map)

- **planthardiness.ars.usda.gov** (USDA-ARS). Zone = average annual **minimum**
  temperature. It governs **overwintering and perennial survival**, not
  planting-calendar timing — so it's the right driver for the perennial/tender
  notes (rosemary, lavender, figs, "protect citrus," blueberry hardiness) and
  for the crop-applicability filter, but it is *not* a substitute for frost
  dates on annual timing.
  - Access: official ZIP search on the site; **GIS grids/shapefiles + ZIP
    tables downloadable from PRISM (Oregon State)**. Unofficial
    **`phzmapi.org/{zip}.json`** returns zone by ZIP with CORS — handy for a
    browser-only prototype; bake the PRISM ZIP table in for production.

### C. Soil data — SSURGO via Soil Data Access ⭐

- **USDA-NRCS Soil Data Access (SDA)** REST API: POST SQL to
  `https://SDMDataAccess.sc.egov.usda.gov/Tabular/post.rest`. Returns, for the
  soil map unit at a lat/long: **texture (% sand/silt/clay), drainage class,
  pH, organic matter, available water capacity, CEC, taxonomy.** Free, public.
  - This directly powers a large fraction of the guide notes that are currently
    generic: "Piedmont clay → rosemary on a mound," "blueberries need acidic
    soil," "carrots need deep loose soil," "good drainage matters more than
    fertility." With SSURGO you can tell a specific user *"your soil is a
    fine-clayey, poorly-drained series at pH 5.4"* and tailor the amendment
    advice instead of assuming Piedmont clay.
  - Alternatives / gap-fillers: **UC-Davis SoilWeb API** (`casoilresource`) and
    **POLARIS** (30 m gridded, good where SSURGO has holes).
  - **CORS caveat:** SDA is a server-to-server API (no CORS). Either pre-bake a
    coarse soil summary or proxy it. For a static site, a light one-time fetch
    at "set my location" that caches the result is the pragmatic path.

### D. Live / near-term weather — for dynamic "act now" guidance

- **NWS `api.weather.gov`** — free, **no key**, US-only, GeoJSON, **CORS-enabled**.
  Gives forecasts **and active alerts** — including **frost/freeze warnings**.
  This turns static chores like "protect strawberry blooms" into a live nudge:
  *"Freeze warning tonight — cover blooms."*
- **Open-Meteo** — free (non-commercial), **no key**, CORS, global. Historical
  reanalysis (ERA5, from 1940) + forecast, hourly, including **soil temperature
  at depth** and enough to compute **growing degree days**. Two big uses:
  1. Replace the hardcoded **"wait for 60°F soil at 4″"** with a *live* readiness
     check for the user's location.
  2. If NCEI station coverage is thin near a user, derive custom 30-yr frost/GDD
     normals from Open-Meteo grids as a fallback.

### E. Growing Degree Days & frost-free season length

- Derived from NCEI normals or Open-Meteo, not a separate portal. Powers the
  **crop-applicability filter** (does a 90-day melon fit a location's frost-free
  window?) and season-length warnings. Low incremental effort once B/D are in.

### F. Day length / photoperiod

- **Pure computation** from latitude + date (NOAA solar-geometry formulas) — no
  API. Powers the winter-growth notes ("growth slows sharply in low light,"
  Napoli carrots "color early in low light") and the **Persephone period**
  (day length < 10 h) that defines the winter-growing floor. Cheap and exact;
  worth doing because it's genuinely latitude-driven and the current text
  assumes Carrboro's ~35°N.

### G. AHS Plant Heat Zone (days > 86°F)

- The American Horticultural Society **Heat Zone Map** explains the heat-limited
  notes ("difficult in NC due to heat," lettuce bolting, unreliable fall peas).
  **Caveat:** the map is from 1997 and has no clean modern/gridded API. Better to
  **approximate heat pressure from Open-Meteo** (annual days ≥ 86°F) than to
  depend on the AHS raster. Flag as "derived," not authoritative.

### H. Elevation / topography (optional, low priority)

- **USGS 3DEP Elevation Point Query Service (EPQS)** — elevation by lat/long;
  combine with aspect for frost-pocket/microclimate hints. Real but marginal
  accuracy gain for a lot of added complexity — a "nice to have," not a phase-1
  item.

---

## 4. How each source maps to a concrete accuracy win

| Existing hardcoded assumption | Source that generalizes it |
|---|---|
| Half-month planting windows (Zone 8a) | **NCEI frost normals** → re-anchor per location (§A) |
| "Frost protection below 25°F," tender-crop survival | **USDA hardiness zone** (§B) |
| "Piedmont clay," drainage, pH, "acidic soil for blueberries" | **SSURGO / SDA** (§C) |
| "Protect strawberry blooms," frost chores | **NWS live alerts** (§D) |
| "Wait for 60°F soil at 4″" | **Open-Meteo soil temp** (§D) |
| "Difficult in NC due to heat," bolting, fall-pea risk | **GDD / days ≥ 86°F** (§E/G) |
| "Growth slows in low light," winter growing | **Photoperiod from latitude** (§F) |
| Long-season crops assumed growable | **Frost-free days + zone → crop filter** (§E) |

---

## 5. Suggested phasing & effort

**Phase 0 — "Your site" panel (low effort, high perceived value, de-risks plumbing).**
Add ZIP/geolocation input. Fetch & display frost dates (NCEI), hardiness zone
(PRISM/phzmapi), and soil summary (SSURGO). *Don't change the calendar yet.*
Ships value immediately and proves the data pipes before touching the crop model.

**Phase 1 — Re-anchor the calendar (the big one).**
Add anchor-relative offset rules to every crop in `data.js`; compute absolute
half-months per location. Validate that Carrboro output is unchanged (regression
gate — reuse the `compare-ncsu.mjs` pattern). Add the crop-applicability filter.

**Phase 2 — Live overlays.**
NWS frost/freeze alerts and Open-Meteo soil-temp readiness surfaced on the chore
list and relevant crops. Degrade gracefully offline (PWA).

**Phase 3 — Soil-aware guidance.**
Turn generic amendment notes into per-site advice from SSURGO (pH, drainage,
texture).

### Static-site implications (important)

The app is a pure static PWA today, and most of this can **stay** static:

- Frost normals, hardiness zones, and a coarse soil layer **don't change** →
  pre-bake as shipped JSON, keep offline support intact.
- Only the **live** layer (NWS/Open-Meteo, and per-point SSURGO) needs runtime
  fetches. Both weather APIs are keyless and CORS-friendly; SSURGO isn't
  CORS-enabled, so fetch it once on "set location" (and cache) or add a tiny
  proxy. No API keys, no paid tiers anywhere in the phase-0–2 path.

---

## 6. Key risks & caveats

- **Nearest-station error.** Frost normals are point/station data; interpolating
  to an arbitrary lat/long (especially in mountains or near coasts) introduces
  error. Expose the source station + distance so users can sanity-check.
- **Microclimate reality.** Even perfect normals miss a user's slope, urban heat
  island, or frost pocket. Frame outputs as probabilities ("10% chance of frost
  after X"), which NCEI supports natively — don't imply false precision.
- **The crop set, not just the timing.** Re-anchoring dates without filtering the
  crop list will confidently tell a Zone 4 gardener to grow okra. The
  applicability filter is not optional.
- **Regional agronomy in prose.** Guide notes ("Cherokee Purple prone to
  cat-facing in humid late-summer Piedmont") are hand-written and Piedmont-tuned.
  Generalizing the *dates* is tractable; generalizing the *narrative advice* is a
  much larger content problem — plan to gate or genericize those notes by region.
- **Licensing/ToS.** Stick to NOAA/USDA/USGS (public domain) and Open-Meteo /
  NWS (open). Avoid scraping the almanac/Garden.org consumer tools.

---

## 7. Bottom line

The heavy lift is **§2 — remodeling crop timing as frost-relative offsets** and
adding a **crop-applicability filter**. Once that's in place, four public, free,
US-wide sources do the rest:

1. **NOAA NCEI frost normals** — the anchor (annual timing).
2. **USDA 2023 hardiness zones** — overwintering & perennial survival.
3. **USDA-NRCS SSURGO** — soil texture/drainage/pH for site-specific advice.
4. **NWS + Open-Meteo** — live frost alerts, soil-temp readiness, GDD/heat.

Plus **photoperiod** computed from latitude for free. All four can be layered in
without abandoning the static/offline PWA model, and the app's existing
confidence-score + source-library + cross-check scaffolding is the right
foundation to extend to a multi-region dataset.

---

### Source links

- [NOAA NCEI U.S. Climate Normals (1991–2020)](https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals) · [Annual/Seasonal normals (freeze dates)](https://www.ncei.noaa.gov/access/search/data-search/normals-annualseasonal-1991-2020) · [NOAA Normals on AWS Open Data](https://registry.opendata.aws/noaa-climate-normals/) · [Climate.gov last-spring-freeze map](https://www.climate.gov/news-features/understanding-climate/interactive-map-average-date-last-spring-freeze-across-united)
- [USDA 2023 Plant Hardiness Zone Map](https://planthardiness.ars.usda.gov/) · [Map creation / GIS via PRISM](https://planthardiness.ars.usda.gov/pages/map-creation) · [phzmapi.org (unofficial ZIP→JSON)](https://phzmapi.org/)
- [USDA-NRCS Soil Data Access — Web Service Help](https://sdmdataaccess.nrcs.usda.gov/WebServiceHelp.aspx) · [SSURGO overview](https://www.nrcs.usda.gov/resources/data-and-reports/soil-survey-geographic-database-ssurgo) · [Web Soil Survey](https://websoilsurvey.nrcs.usda.gov/app/)
- [NWS api.weather.gov (free, no key)](https://www.weather.gov/documentation/services-web-api) · [Open-Meteo](https://open-meteo.com/) · [Open-Meteo Historical Weather API](https://open-meteo.com/en/docs/historical-weather-api)
- [Old Farmer's Almanac frost dates (NCEI-derived, not an API)](https://www.almanac.com/gardening/frostdates) · [Garden.org frost dates (cites NCEI)](https://garden.org/apps/frost-dates/)
