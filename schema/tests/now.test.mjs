// Now-view selector tests (node:test, no deps).
import { test } from "node:test";
import assert from "node:assert/strict";

import { computeNow, slotOfDay } from "../engine/now.ts";
import { emptyGrid, calendarDayOfYear } from "../engine/resolve.ts";

// Build a grid with codes at named month/half slots.
function grid(spec) {
  const g = emptyGrid();
  for (const [month, half, codes] of spec) g[month][half] = codes;
  return g;
}

function row(key, type, spec) {
  return { key, name: key, type, grid: grid(spec) };
}

test("slotOfDay maps day-of-year to the right half-month slot", () => {
  assert.equal(slotOfDay(calendarDayOfYear(1, 1)), 0); // Jan h1
  assert.equal(slotOfDay(calendarDayOfYear(1, 20)), 1); // Jan h2
  assert.equal(slotOfDay(calendarDayOfYear(7, 10)), 12); // Jul h1
  assert.equal(slotOfDay(calendarDayOfYear(12, 31)), 23); // Dec h2
});

test("groups actionable codes for the current window, in group order", () => {
  const rows = [
    row("Tomatoes", "vegetable", [["jul", "half1", ["h"]], ["jul", "half2", ["h"]]]),
    row("Kale", "vegetable", [["jul", "half1", ["si"]], ["jul", "half2", ["s"]]]),
  ];
  // Early July → current slot 12, window = {12,13}.
  const res = computeNow(rows, calendarDayOfYear(7, 5), 1);
  assert.equal(res.slotLabel, "Early July");
  const labels = res.groups.map((g) => g.label);
  // Sow indoors before sow outdoors before harvest (GROUP_ORDER).
  assert.deepEqual(labels, ["Sow indoors", "Sow outdoors", "Harvest"]);
  assert.equal(res.count, 3);
  assert.ok(res.groups.find((g) => g.code === "h").items.some((i) => i.name === "Tomatoes"));
});

test("endingSoon flags a window that closes after the current period", () => {
  // Harvest present Jul h1 (in window) but NOT Aug h1 (slot after window).
  const rows = [row("Lettuce", "vegetable", [["jun", "half2", ["h"]], ["jul", "half1", ["h"]]])];
  const res = computeNow(rows, calendarDayOfYear(7, 3), 0); // window = {12} only
  const item = res.groups[0].items[0];
  assert.equal(item.code, "h");
  assert.equal(item.endingSoon, true, "no harvest in Jul h2 → closing");
});

test("does NOT flag endingSoon when the window continues", () => {
  const rows = [row("Chard", "vegetable", [["jul", "half1", ["h"]], ["jul", "half2", ["h"]], ["aug", "half1", ["h"]]])];
  const res = computeNow(rows, calendarDayOfYear(7, 3), 0);
  assert.equal(res.groups[0].items[0].endingSoon, false);
});

test("justOpened flags a code absent in the slot just before today", () => {
  // Transplant starts Jul h1; nothing in Jun h2.
  const rows = [row("Peppers", "vegetable", [["jul", "half1", ["t"]], ["jul", "half2", ["t"]]])];
  const res = computeNow(rows, calendarDayOfYear(7, 4), 1);
  const item = res.groups[0].items[0];
  assert.equal(item.justOpened, true);
});

test("year wrap: late December window includes January slots", () => {
  const rows = [row("Garlic", "vegetable", [["jan", "half1", ["h"]]])];
  // Dec h2 = slot 23, window {23, 0} includes Jan h1.
  const res = computeNow(rows, calendarDayOfYear(12, 20), 1);
  assert.equal(res.slotLabel, "Late December");
  assert.equal(res.count, 1);
  assert.equal(res.groups[0].code, "h");
});

test("computed-estimate flag rides through", () => {
  const rows = [{ ...row("Okra", "vegetable", [["jul", "half1", ["s"]]]), computedEstimate: true }];
  const res = computeNow(rows, calendarDayOfYear(7, 2), 0);
  assert.equal(res.groups[0].items[0].computedEstimate, true);
});

test("empty when nothing is active in the window", () => {
  const rows = [row("Spinach", "vegetable", [["nov", "half1", ["s"]]])];
  const res = computeNow(rows, calendarDayOfYear(7, 2), 1);
  assert.equal(res.count, 0);
  assert.deepEqual(res.groups, []);
});

test("closing items sort ahead of continuing ones within a group", () => {
  const rows = [
    row("Continuing", "vegetable", [["jul", "half1", ["h"]], ["jul", "half2", ["h"]]]),
    row("Closing", "vegetable", [["jul", "half1", ["h"]]]),
  ];
  const res = computeNow(rows, calendarDayOfYear(7, 3), 0);
  const names = res.groups[0].items.map((i) => i.name);
  assert.deepEqual(names, ["Closing", "Continuing"]);
});
