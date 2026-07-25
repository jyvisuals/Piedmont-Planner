# Paths for Improvement — A Candid State of Play

_Not a feature wishlist (see `additional-data-sources.md` and
`accounts-and-community.md` for those). This is an honest assessment of where
the project is strong, where it's quietly weak, and which improvements matter
most — including the unglamorous ones._

## The core tension

Over the multi-region build we optimized two things hard:

- **Breadth** — 17 seed cities → 6,948 frost stations + 32,380 ZIPs nationwide.
- **Surfaces** — the "Your site" panel, the honesty guards, the "Now" view.

We did **not** proportionally invest in two things, and that's now the most
important fact about the project:

1. **Validated correctness of what we ship.** The computed calendar that most of
   the country now sees has never been checked against ground truth.
2. **Automated protection of the UI.** The data has a golden gate; the growing
   pile of `script.js` / `app/main.js` / Now-view code has *zero* CI coverage.

We've scaled confidence-projection faster than validated correctness. The
highest-value improvements are the ones that close that gap — not new features.

---

## Path A — Correctness & trust (most important, least glamorous)

### A1. Validate the computed engine against other regions' calendars
The computed layer is generic offsets (`[-42,-28]` for tender indoor sow, etc.)
built from **one region's crop assumptions**, and the crop catalog's `hardiness`
and `daysToMaturity` are explicitly *"provisional textbook classification,
pending regional review"* (see the header of `crop-catalog.ts`). Yet those
numbers drive both the timing and the applicability filter for the entire US.

**First step:** generalize `scripts/compare-ncsu.mjs` into a multi-region
cross-check. Several extension services publish planting calendars (U of MN,
Texas A&M, UC, Cornell). Transcribe 2–3 into fixtures and diff the *computed*
output at those locations against them, the same way we already gate Carrboro.
That converts "estimate-grade, we hope" into "estimate-grade, measured — off by
a median of N half-months in these regions."

### A2. Regional crop sets
Every location currently gets **Carrboro's 77 crops**, filtered only by
frost-free days. That's wrong in both directions: a Florida gardener is missing
crops that matter there (and gets cool-season crops that bolt/fail), and an
Arizona gardener sees no desert-adapted options. The frost-free filter is a
blunt instrument; real regional suitability needs heat tolerance and, ideally,
the USDA-PLANTS regional data already scoped in `additional-data-sources.md`.

### A3. Confidence gradations + the authoritative fallback
Today a row is binary: curated or "est." A computed estimate gives no sense of
*how* uncertain it is. Two cheap improvements:
- Grade computed confidence (e.g. by how far the crop's needs sit from the
  site's season length, or nearest-station distance).
- **Link every user to their county's Cooperative Extension office.** The
  Land-Grant / Cooperative Extension system has an office for essentially every
  US county with authoritative local planting guidance. A "not sure? check your
  local extension office" link (county → office URL) is honest, cheap, and turns
  a computed guess into a responsible starting point rather than a claim.

---

## Path B — Engineering resilience

### B1. The UI has no automated test coverage — add a CI browser smoke test ✅ DONE
The golden gate protects the *data*, and 91 node:tests protect the *engine*. But
every UI regression this session (the missing tab handler, the missing
`PREFERRED_VIEW_ORDER` entry) was caught by hand-run Playwright, not CI — and the
next one won't be. We already have the harness. **First step:** commit a small
headless-Chromium smoke test (default renders 77 rows; a computed site marks
"est."; the Now view populates; view-switching works) and run it in
`test.yml`. This is the single biggest durability gap given how much UI now
exists.

**Done:** `tests/ui/smoke.mjs` — a self-contained headless-Chromium test (its
own static server, plain assertions, isolated Playwright dep so the site stays
dependency-free) covering default render, all three view switches, the site
panel + ZIP entry, curated-vs-computed markers, reset, and a zero-console-error
gate. Runs as the `ui-smoke` CI job. Verified to fail the build on regression.

### B2. Surface data provenance in-app
The data indexes record source URLs, md5s, and fetch dates (good), but none of
it reaches the user. A small "data sources & vintage" disclosure (NCEI
1991–2020, PRISM 2023, CONUS-only zones) builds trust and pre-empts "why is this
zone blank" confusion.

---

## Path C — Depth: prove the project is more than one good region

Right now **the entire non-Piedmont US is computed-only**. The whole
override-pack architecture — validator, precedence, contribution model — has
never been exercised by a *second* curated region. Authoring even one more pack
(or recruiting an extension-savvy gardener elsewhere to) would:
- give a second part of the country genuinely reviewed data,
- pressure-test the pack schema and validator against a real second author,
- and turn "the contribution model exists on paper" into "it works."

This is the true start of the community/Wikipedia vision, and it needs no
accounts. It's also the honest counterweight to Path A: validation tells you how
wrong the computed layer is; a second pack is how you *fix* a region once you
know.

---

## Path D — Reach: does anyone use it?

A genuinely useful, free, national tool that nobody can find isn't improving
anyone's garden. Low-effort, high-leverage:
- **Shareable location URLs** (`?zip=59715`) — the natural way this spreads;
  "here's *your* planting calendar" as a link. An afternoon's work.
- **Per-site page metadata / SEO** — title and description that reflect the
  selected location so search and link previews are meaningful.
- Basic **accessibility + mobile field-use pass** — it's a PWA meant for a phone
  in a garden; verify touch targets, contrast, the Now view on a narrow screen,
  and genuinely-offline reliability.

---

## Path E — The temporal layer (feature frontier)

Covered in `additional-data-sources.md`: the "Now" view is now built as the
frame, so the sequence is precipitation normals (near-free) → USA-NPN Spring
Index (the flagship: makes the calendar respond to the actual year) → live
overlays (frost alerts, pests, drought). This is the most *exciting* path; it is
not the most *important* one until Path A and B are addressed.

---

## Recommended sequence

1. **B1 — CI browser smoke test.** Cheap, and it stops protecting-by-hand. Do it
   before building anything else on the UI.
2. **A1 — multi-region validation harness.** Measure how good the computed layer
   actually is; you can't improve or honestly caveat what you haven't measured.
3. **A3 — extension-office links + confidence grading.** Small, and it makes the
   honesty story complete where the computed data is weakest.
4. **C — a second curated pack.** Depth; proves the contribution model.
5. **E — precipitation, then phenology.** The feature frontier, on a foundation
   you now trust.

The theme: **we built a wide, honest, well-architected surface over data we
have not yet verified. The best next work makes the data trustworthy and keeps
the surface from regressing — then resumes adding to it.**
