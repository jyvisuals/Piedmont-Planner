// Headless-browser smoke test for the app UI (Path B1 in docs/improvement-paths.md).
//
// The engine has 91 node:tests and the data has a golden gate, but the UI wiring
// (view machinery, site panel, Now view) had NO automated coverage — every UI
// regression this session was caught by hand. This is that coverage, in CI.
//
// Self-contained: starts its own static server over the repo root, drives a
// headless Chromium, asserts the core flows + the specific machinery that has
// broken before (tab registration, view-order, click handlers), and fails the
// build on any console/page error. No test framework — plain assertions.
//
// Local:  PW_EXECUTABLE_PATH=/opt/pw-browsers/chromium node tests/ui/smoke.mjs
// CI:     playwright installs chromium; auto-found. See .github/workflows/test.yml

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Prefer full playwright (CI, auto-finds its browser); fall back to
// playwright-core (local, with PW_EXECUTABLE_PATH).
let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  ({ chromium } = await import("playwright-core"));
}

const repoRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".css": "text/css", ".svg": "image/svg+xml",
  ".png": "image/png", ".webmanifest": "application/manifest+json",
  ".ico": "image/x-icon",
};

function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    let rel = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
    const filePath = path.join(repoRoot, rel);
    if (!filePath.startsWith(repoRoot) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404); res.end("not found"); return;
    }
    res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, () => resolve(server)));
}

// --- tiny assertion harness -------------------------------------------------
const failures = [];
let checks = 0;
function ok(cond, msg) {
  checks++;
  if (!cond) { failures.push(msg); console.error(`  ✗ ${msg}`); }
  else console.log(`  ✓ ${msg}`);
}

async function main() {
  const server = await startServer();
  const base = `http://localhost:${server.address().port}/`;

  const launchOpts = { headless: true };
  if (process.env.PW_EXECUTABLE_PATH) launchOpts.executablePath = process.env.PW_EXECUTABLE_PATH;
  const browser = await chromium.launch(launchOpts);
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") pageErrors.push(`console: ${m.text()}`); });

  try {
    await page.goto(base, { waitUntil: "networkidle" });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "networkidle" });

    // --- default (Carrboro) render: Now is the default view ---
    ok(await page.locator("#nowView").isVisible(), "Now is the default view on load");
    ok((await page.locator("#monthViewBtn").count()) === 0, "Month view/tab is retired");
    const nowGroups = await page.locator("#nowContent .now-group").count();
    ok(nowGroups > 0, `Now view populates groups (got ${nowGroups})`);
    ok((await page.locator("#nowSubtitle").textContent()).includes("Carrboro"), "Now subtitle names the default site");
    ok((await page.locator("#nowContent .now-group-chip").count()) > 0, "Now groups render as colored activity chips");

    // --- view switching: Now ↔ Calendar (two tabs); Calendar renders on demand ---
    await page.locator("#gridViewBtn").click();
    await page.waitForTimeout(200);
    ok(await page.locator("#gridView").isVisible(), "Calendar view activates on click");
    const rowCount = await page.locator("#gridTableBody tr").count();
    ok(rowCount === 77, `Calendar renders 77 crop rows (got ${rowCount})`);
    ok((await page.locator(".review-confidence-badge").count()) > 0, "Calendar shows curated confidence badges");
    await page.locator("#nowViewBtn").click();
    await page.waitForTimeout(150);
    ok(await page.locator("#nowView").isVisible(), "Now view returns on click");

    // --- site panel: ZIP entry → curated + computed ---
    await page.locator("#sitePanel summary").click();
    await page.fill("#siteZip", "27510");
    await page.locator("#siteZipBtn").click();
    await page.waitForTimeout(1000);
    ok((await page.locator("#siteSummary").textContent()).includes("zone 8a"), "ZIP 27510 resolves to zone 8a");

    await page.fill("#siteZip", "59715"); // Bozeman MT — computed
    await page.locator("#siteZipBtn").click();
    await page.waitForTimeout(1200);
    ok((await page.locator("#gridTableBody tr").count()) > 0, "computed site (Bozeman) renders a calendar");
    ok((await page.locator("#siteNote").textContent()).toLowerCase().includes("modeled"), "computed site is framed as modeled (no scary est. warnings)");
    ok((await page.locator("#siteCalcWrap").getAttribute("hidden")) !== null, "calculated toggle is hidden for an out-of-region site (no curated data)");

    // --- shareable URL + dynamic title ---
    ok(page.url().includes("zip=59715"), `applying a ZIP deep-links the URL (got ${page.url()})`);
    ok((await page.title()).includes("59715"), "document title reflects the selected site");

    // --- reset restores default ---
    await page.locator("#siteResetBtn").click();
    await page.waitForTimeout(400);
    const resetRows = await page.locator("#gridTableBody tr").count();
    ok(resetRows === 77, `reset restores 77-crop default (got ${resetRows})`);
    ok(!page.url().includes("zip="), "reset clears the URL query");

    // --- filter consistency: greenhouse filter reaches the Now view ---
    await page.locator("#nowViewBtn").click();
    await page.waitForTimeout(150);
    const ghBox = page.locator("#showGreenhouse");
    if ((await ghBox.count()) && (await ghBox.isChecked())) {
      await ghBox.uncheck();
      await page.waitForTimeout(150);
      const nowHasGreenhouse = await page.evaluate(() => {
        const rows = window.__getNowRows ? window.__getNowRows() : [];
        return rows.some((r) =>
          Object.values(r.grid).some((m) =>
            [...(m.half1 || []), ...(m.half2 || [])].some((c) => c === "sg" || c === "tg")
          )
        );
      });
      ok(!nowHasGreenhouse, "greenhouse filter reaches the Now view (no sg/tg codes when off)");
      await ghBox.check();
      await page.waitForTimeout(100);
    }

    // --- calculated toggle: present for curated default, flips the framing ---
    ok((await page.locator("#siteCalcWrap").getAttribute("hidden")) === null, "calculated toggle shows for the curated default (Carrboro)");
    await page.locator("#siteCalcToggle").check();
    await page.waitForTimeout(1200);
    ok((await page.locator("#siteNote").textContent()).toLowerCase().includes("calculated"), "toggling on shows the calculated calendar");
    await page.locator("#siteCalcToggle").uncheck();
    await page.waitForTimeout(500);
    ok((await page.locator("#siteNote").textContent()).toLowerCase().includes("hand-reviewed"), "toggling off restores the curated calendar");

    ok(pageErrors.length === 0, `no console/page errors (got ${pageErrors.length}: ${pageErrors.slice(0, 3).join(" | ")})`);
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`\nui-smoke: ${checks - failures.length}/${checks} checks passed`);
  if (failures.length) {
    console.error(`ui-smoke FAILED:\n${failures.map((f) => "  - " + f).join("\n")}`);
    process.exit(1);
  }
}

main().catch((err) => { console.error("ui-smoke crashed:", err); process.exit(1); });
