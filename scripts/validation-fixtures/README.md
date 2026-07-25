# Validation fixtures — reference calendars for the computed engine

`scripts/validate-computed.mjs` measures how far the **computed** planting
calendar (generic hardiness + DTH rules, run blind of any curated data) diverges
from **hand-reviewed ground truth**. It is **reference-driven**: it validates
against the curated Piedmont pack AND every `*.json` fixture in this directory,
each at its own frost dates.

Shipped fixtures:
- `nc-central-ag756.json` — the NC State AG-756 Central-NC calendar (generated
  from the in-repo transcription by `scripts/etl/build-ag756-fixture.mjs`). A
  genuine *independent* reference (the curated pack deliberately diverges from
  AG-756), though the same geographic region. Computed scores **100% primary
  timing** against it.

The computed layer's real risk is *other* regions, so this directory is the
extension point: transcribe another region's published extension planting
calendar into a fixture and the harness validates there automatically. (None
shipped yet — extension calendars were not fetchable in the build environment,
and fabricating dates would corrupt the validation.)

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

- Primary timing: **97%** (56/58) — the computed layer gets the season right.
- **Fixed:** `garlic` — was spring-planted by the generic very-hardy rule; now
  carries an `overwinter` catalog flag so the computed rules fall-plant it
  around first frost (moved from misplaced to correct).
- **Accepted generic-layer limitations (2):** `parsnips` and `chamomile`. Both
  are the *right season* (spring) but the generic window runs earlier/wider than
  their true late-spring window. They are NOT season flips, and the rule that
  would need changing is the same one that correctly handles the other 55 crops
  — forcing these two would regress many. Left as "est."-labeled estimates;
  a future per-crop computed-override mechanism could address them without
  touching the shared rule.
- **Succession windows added:** warm-season direct crops (beans, squash,
  cucumbers…) now sow continuously from after last frost to the last planting
  that matures before first frost, via a two-anchor window that self-adjusts to
  season length. This closed most of the coverage gap: full fidelity **12%→29%**,
  missed slots **153→82**.
