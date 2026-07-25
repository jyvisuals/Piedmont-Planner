# `schema/` — the multi-pack data contracts (spec)

This is the concrete form of decisions **D1–D5** in
[`../docs/architecture-decisions.md`](../docs/architecture-decisions.md). It is a
**spec**, not yet wired into the live app: it defines the types every pack, the
crop catalog, and the offset engine must satisfy, and ships one worked pack so
the contracts are exercised by real data instead of prose.

## Files

| File | Decision(s) | What it is |
|---|---|---|
| `types.ts` | D1–D8 | The contract layer — anchors, the timing union (verbatim grid \| anchored events), crop catalog, pack schema + footprint/precedence, provenance, and the provider/resolver seams. |
| `crop-catalog.ts` | D3, D4 | Global crop catalog: stable slugs + **structured** days-to-maturity (parsed from the old free text). |
| `packs/piedmont-nc.ts` | D2, D3, D5 | Pack #1, demonstrating **both timing kinds**: **tomato** carries its reviewed grid *verbatim* (the migration default — zero-loss), **spinach** is *anchored* (spring forward from `lastFrost`, fall/overwinter backward from `firstFrost`). |
| `tsconfig.json` | D9 | Strict typecheck (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`). |

## How the pieces map to the decisions

- **D1 — anchors are the currency.** `AnchorRef` is the fixed vocabulary
  (`lastFrost`, `firstFrost`, `soilTemp`, `photoperiod`, `gddAccum`,
  `calendarDate`). Frost is a *reference* (`FrostAnchorRef`: threshold +
  probability, default 32°F/50%), never a bare date — so the 10–90% spread stays
  expressible.
- **D2 — the timing union.** Curated packs may carry their reviewed half-month
  grid **verbatim** (`{ kind: "verbatim", grid }`) — no lossy grid→offset
  inversion, and the "Carrboro must not move" gate holds by construction. Day
  precision is opt-in via **anchored events** (`{ kind: "anchored", events }`),
  which the computed layer always uses. Spinach shows why events matter: spring
  counts forward from `lastFrost`, fall counts backward from `firstFrost`, in
  one list. Resolved windows live on the unbounded **season-day axis** (may
  exceed 366) so cross-year crops (garlic, overwinter sows) work; half-months
  are the rendering currency in both cases.
- **D3 — stable crop identity.** Everything keys off `CropSlug`. Varieties/tips
  live in the *pack* (regional); identity + DTH live in the *catalog* (global).
- **D4 — structured DTH.** `DaysToMaturity` is numeric per method; a derived
  harvest (`DerivedHarvest`) references a planting event id + a method, so the
  engine can place harvest and run the frost-free-days filter.
- **D5 — pack schema + precedence.** `RegionPack` carries `schemaVersion`,
  `footprint` geometry, `specificity` (most-specific wins), and mandatory
  `Provenance` per overriding row. Omitting `events` inherits computed timing;
  `excluded: true` hides a crop for the region.

## Verify

```bash
cd schema && tsc --noEmit -p tsconfig.json    # strict; currently passes
```

## Next steps (not in this spec)

1. **Loader + regression gate** — mechanically translate `data.js` into the
   full verbatim Piedmont pack, and assert (golden test) that its grids equal
   `data.js` exactly. By-construction, but still asserted.
2. **Offset engine** — implement `Resolver`: given a plain-data `SiteContext`,
   turn `TimingEvent`s into `ResolvedWindow`s on the season-day axis, then
   bucket to half-month grids. Pure, synchronous, unit-tested with `node:test`
   (built into Node — no new dependencies), including cross-year cases.
3. **Providers** — static-JSON `FrostProvider` + `ZoneProvider` first (D6/D7),
   assembling the serializable `SiteContext`.
4. **Second region** — add one computed-only region to force N=2 on every seam
   before scaling (the sequencing insight in the decisions doc).
5. **Runtime pack validator** — TS types protect only TS-authored packs;
   contributor packs arriving as JSON need load-time schema validation.
