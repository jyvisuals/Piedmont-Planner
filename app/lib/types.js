// Piedmont Planner — multi-pack data contracts (spec)
// =====================================================
// This file makes decisions D1–D5 (see docs/architecture-decisions.md) concrete
// as TypeScript. It is the *contract layer*: packs, the crop catalog, and the
// offset engine all conform to these types, and a pack that violates the schema
// fails to compile (D9). Nothing here is wired into the live app yet — it is the
// spec you build the engine and future packs against.
export const DEFAULT_FROST_REF = {
    thresholdF: 32,
    probabilityPct: 50,
};
