# Accounts & Community: Per-User Customization → Crowd Signals

_The long-run vision: a GitHub/Wikipedia-like model where many people's
customizations become signals that improve the shared dataset over time. The
first pass: a login and per-account customizations. This doc stages that path
on top of the existing architecture._

## The load-bearing insight

**The personal overlay pack IS the account data model.** A user's customization
is a `RegionPack` (see `schema/types.ts`) with:

- footprint = their location (coarse), highest precedence in the stack
- crop rows overriding exactly what they changed (verbatim grid tweaks, hidden
  crops, personal tips) — field-level, like any pack
- validated by `validateRegionPack`, resolved by the existing resolver

No new customization format, no new merge semantics, no new validator. And
because overlays are *structured diffs against a known base*, they are
analyzable later — which is what makes the crowd-signal future possible at all.
Freeform edits could never be aggregated; pack-shaped edits can.

## Architectural pin (D10): accounts are optional, local-first

The overlay lives in `localStorage` and works fully offline — the static-PWA /
GitHub Pages model is preserved, and the feature ships before any backend
exists. Login adds durability, cross-device sync, and (later) sharing. The
backend, when it arrives, is a dumb per-user JSON store behind a seam
(`OverlayStore` in `schema/types.ts`), exactly parallel to the data-provider
seams: swap `localStorage` ↔ remote without touching engine, resolver, or UI.

## Stages

### Stage A — local overlay (no login, no backend)
Requires app integration (the UI consuming `ResolvedCropCalendar[]`) first.
Editable surface, all expressible in the existing schema:
- per-crop timing tweaks → a verbatim-grid override for that crop
- hide a crop → `excluded: true`; add a crop → a new row
- personal notes → `tips`
- personal frost-date nudge → a user-supplied override on the SiteContext
  anchors (the anchors-as-parameters design already permits this)
Stored via the `localStorage` `OverlayStore`; validated before save.

### Stage B — login + per-account sync (the requested first pass)
- **Auth + storage recommendation: Supabase magic-link email.** Free tier,
  designed to work from a static site (the anon key is public by design), row-
  level security, no password management, ~50 lines of client code, no servers
  to run. Firebase is the equivalent alternative.
- **Why not GitHub OAuth for pass one:** GitHub's device-flow endpoints do not
  allow browser CORS, so a static site needs a token-exchange proxy anyway.
  Fine later (and thematically nice for contributor identity); not the minimal
  first pass.
- **Data model:** one table — `user_id, overlay jsonb, updated_at`, RLS
  `user_id = auth.uid()`. The server never interprets the overlay; the client
  validates with `validateRegionPack` before save and after load.
- **Sync semantics:** last-write-wins with `updated_at` guard is enough for
  pass one (one gardener, few devices); keep a local copy always so offline
  keeps working. Conflicts surface as "local vs remote differ — keep which?"
- **Remote `OverlayStore` impl** drops in behind the same seam as Stage A.

### Stage C — community signals (the GitHub/Wikipedia future)
- **Aggregation:** overlay diffs vs the resolved baseline, bucketed per
  (region-cell, crop, slot/event). E.g. "23 of 31 overlays within 50 km moved
  tomato transplant 2 weeks earlier."
- **k-anonymity threshold** before any signal is computed or shown (no
  signal from < k gardeners; k ≈ 10).
- **Signals inform curators; they never auto-edit shared data.** The output is
  a curator report — the same pattern as `scripts/compare-ncsu.mjs` — and a
  curator promotes accepted signals into a pack row with a new provenance
  source kind: *community-corroborated (N gardeners, region, season-years)*.
  This extends the existing confidence/evidence system rather than bypassing
  it, and it is the Wikipedia lesson applied: quality comes from review and
  history, not from open writes. (See also the no-mechanical-change guardrail
  in the transition-cost ledger — it applies to crowds too.)
- **Sharing/forking:** "publish my overlay as a proposed pack" becomes the
  contribution pipeline (a PR of a pack JSON that must pass
  `validateRegionPack` + review), which is the literal GitHub model.

## Privacy pins (hard to retrofit — decide now)

- A garden's location is a **home address**. Overlay footprints are coarse by
  default (ZIP-centroid bbox); precise coordinates never leave the device
  unless the user explicitly shares.
- Published/promoted packs get fuzzed footprints and no account linkage unless
  the user opts into attribution.
- Aggregation runs on region cells (e.g. ~25–50 km), never on raw points, and
  respects the k-threshold.
- Email is the only identity data needed for pass one; store nothing else.

## Sequencing

App integration → Stage A (local overlay) → Stage B (login + sync) → Stage C
(signals). A and B are independent of the knowledge-portability roadmap; C
feeds it (community corroboration becomes an evidence source for pack
revisions and, eventually, for condition-keyed advice).
