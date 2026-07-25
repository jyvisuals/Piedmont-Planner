# Validation fixtures — reference calendars for the computed engine

`scripts/validate-computed.mjs` measures how far the **computed** planting
calendar (generic hardiness + DTH rules, run blind of any curated data) diverges
from **hand-reviewed ground truth**. v1 validates at the one place we have solid
truth in-repo: the **Piedmont**, against the curated pack at Carrboro's real NCEI
frost dates.

The computed layer's real risk is *other* regions, so this directory is the
extension point: transcribe another region's published extension planting
calendar into a fixture and the harness can validate there too.

## Fixture schema (`<region>.json`)

```jsonc
{
  "region": "Central Minnesota",
  "source": {
    "title": "U of MN Extension — Planting dates for vegetables",
    "url": "https://extension.umn.edu/…",
    "transcribedBy": "you",
    "transcribedOn": "2026-08-01",
    "note": "Transcribed by hand; verify against the source before trusting."
  },
  // The site to resolve the computed engine at. Either provide frost dates
  // directly, or a station id present in app/data/frost/ tiles.
  "site": {
    "lat": 45.55, "lng": -94.2,
    "lastFrost": { "32/50": 138 },   // day-of-year, non-leap
    "firstFrost": { "32/50": 271 }
  },
  // Reference outdoor-planting windows per crop slug (catalog slugs), as
  // half-month labels "mon h1"/"mon h2". Only outdoor sow/transplant/sets.
  "crops": {
    "tomatoes": ["may h2", "jun h1"],
    "spinach":  ["apr h1", "apr h2", "aug h2", "sep h1"]
  }
}
```

## Honesty rules (non-negotiable)

- **Transcribe, never invent.** Every window must come from a real published
  extension calendar, cited in `source`. If a crop isn't in the source, omit it.
- Mark fixtures as transcribed + unverified until a human checks them.
- Prefer Land-Grant/Cooperative Extension sources (authoritative, public).

## What the numbers mean

- **Primary timing** (headline): does computed land in the right *season*? A
  failure = a real error (wrong season), e.g. an overwintered crop spring-planted.
- **Full fidelity**: does it reproduce *every* window? Gaps here are mostly the
  curated pack's succession runs the conservative single-window rule omits —
  coverage, not wrong dates.
- **Misplaced**: computed windows with zero overlap — the true bugs to fix.

## Current findings (Piedmont, computed vs curated)

- Primary timing: **95%** (55/58) — the computed layer gets the season right.
- Misplaced (**3 real bugs**): `garlic`, `parsnips`, `chamomile` — overwintered
  / cool-season crops the generic rule spring-plants. Fixing needs catalog
  metadata (an "overwinter / fall-sown" signal) so the rules stop treating them
  as ordinary spring crops.
- Dominant coverage gap: succession-sown summer crops (beans, squash, cucumbers)
  where curated sows continuously but computed gives one window — a rule
  enhancement (succession windows), not a timing error.
