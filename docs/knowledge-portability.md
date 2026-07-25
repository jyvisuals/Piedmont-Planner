# Knowledge Portability: Retaining Carrboro's Customizations and Reusing Them Elsewhere

_Companion to `architecture-decisions.md` (which protects the Carrboro data from
loss) and the transition-cost ledger (which lists what the multi-region move
risks). This doc goes one step further: how the curated Carrboro knowledge can
be **reused by other regions** instead of merely preserved in a silo._

## The current state

The verbatim Piedmont pack preserves everything, but it is *place-keyed*: a user
outside the footprint gets generic computed rules and none of the curated
judgment — even the parts that would genuinely apply to them.

## The core observation: three kinds of knowledge, mixed

The pack's prose actually contains three tiers with very different portability:

| Tier | Example | Portable to |
|---|---|---|
| **Universal crop craft** | "Deep-transplant tomatoes, bury 2/3 of stem"; "single-leader prune disease-prone heirlooms" | Everywhere |
| **Condition-keyed** | "Piedmont clay → rosemary on a mound"; "fall peas unreliable in hot-soil years"; "Cherokee Purple cat-facing in humid late summer" | Anywhere the *condition* holds (detectable via SSURGO texture/drainage, heat metrics, humidity) |
| **Truly local** | "Send soil test to NC State"; "Chandler is the NC Piedmont standard" | The pack's own region |

Today all three live undifferentiated in `tips`/`varieties` prose, so all three
are trapped in the pack.

## Mechanisms (ordered by leverage)

### 1. Three-tier knowledge split
Move universal craft to the **crop catalog** (global layer); keep truly-local
prose in the pack; introduce the conditional tier below. The resolver's
field-level fall-through already supports the shape (pack tips override catalog
tips). Curator effort: a one-time triage of existing prose, crop by crop —
mechanical enough to be assisted, judgment-reviewed like the original review
pass. New regions then inherit the universal tier for free.

### 2. Condition-keyed advice (the portability engine)
Advice tagged with the condition it depends on, not the place it was written:

```jsonc
{ "when": { "soilTexture": ["clay"] },
  "text": "Good drainage matters more than fertility — grow rosemary on a mound, raised bed, or large pot." }
{ "when": { "hotSoilFallRisk": true },
  "text": "Fall peas are technically possible but unreliable in hot-soil years — treat September sowing as a gamble." }
```

The engine matches conditions against the SiteContext (SSURGO soil summary,
heat/GDD metrics, humidity class) and re-targets the advice to ANY matching
site. This converts curated Piedmont experience into a portable rule library.
Requires: a small controlled condition vocabulary (soil texture/drainage class,
heat-pressure band, humidity band, season-length band) — pin it like the anchor
vocabulary (D1); it is the same kind of one-way door.

### 3. Climate-analog adaptation (origin: "adapted")
For pack-less regions, borrow the most climatically similar curated pack and
shift its verbatim grids by the frost-date delta, labeled honestly:
*"adapted from the Carrboro pack (similar climate), shifted +9 days."*
A third origin tier between `curated` and `computed` — better than generic
rules because deliberate absences and slot correlations transfer. Similarity =
distance in (frost dates, GDD, heat days, zone) space; cap the allowed delta
and fall back to computed beyond it. Must never be presented as curated (D8).

### 4. Structured varieties
`"Chandler (NC Piedmont standard)"` → `{ name, traits: ["spring-bearing"],
testedIn: ["piedmont-nc"], note }`. Other regions can then query by trait
("heat-tolerant romaine proven in the humid Southeast") instead of losing
variety knowledge inside prose. Additive schema change on pack rows.

### 5. Personal overlay pack (retention of YOUR customizations)
A user's own garden quirks — observed frost dates, deer pressure, greenhouse,
bed-specific notes — become a pack with a tiny footprint (their yard) at
highest precedence, stored client-side (localStorage), riding the existing
precedence stack with **zero schema change**. Also the contribution on-ramp:
"promote my overlay to a shared pack" is the natural PR pipeline. A
user-observed frost date can locally nudge the SiteContext anchors (the
anchors-as-parameters design already allows this).

### 6. Anchored chores
The `TASKS` calendar is carried verbatim but is place-locked. Long-term, chores
generalize exactly like crops: anchor them ("prune fruit trees while dormant" →
`lastFrost` − 6..−2 weeks; "order seeds" → `lastFrost` − 14..−10 weeks). The
computed layer can then generate a sensible chore list for uncurated regions
while curated packs keep verbatim task text. Same verbatim-vs-anchored union,
applied to chores.

## Sequencing note

None of these block app integration. The natural order afterward:
(5) personal overlay (cheapest, immediate user value) → (4) structured
varieties (small, additive) → (1)+(2) the knowledge split with a pinned
condition vocabulary (the big win, one-way door — design carefully) →
(3) climate-analog adaptation → (6) anchored chores.

The guardrail from the transition-cost ledger still applies throughout: the
Carrboro pack's verbatim grids and authored prose are never mechanically
converted — tiering and conditionalizing are curator-reviewed re-authoring,
not automated migrations.
