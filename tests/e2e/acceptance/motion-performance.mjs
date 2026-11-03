import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir, writeFile, open } from "node:fs/promises";
import { spawn } from "node:child_process";

const port = process.env.DEMO_PORT ?? "3120";
const apiPort = process.env.DEMO_API_PORT ?? "3121";
const base = process.env.DEMO_BASE_URL ?? `http://127.0.0.1:${port}`;
const evidence = process.env.DEMO_EVIDENCE_DIR ?? "docs/project/evidence/MOTION-002";
const recipe = "/records/rec_11111111-1111-4111-8111-000000000002";
await mkdir(evidence, { recursive: true });
let managed;
if (process.env.DEMO_MANAGED_SERVER === "1") {
  await mkdir(".local/demo-handoff", { recursive: true });
  const log = await open(".local/demo-handoff/motion-performance-server.log", "w");
  managed = spawn(process.execPath, ["scripts/demo/run-demo.mjs", "--skip-build", "--port", port, "--api-port", apiPort], { stdio: ["ignore", log.fd, log.fd] });
}
for (let attempt = 0; attempt < 100; attempt += 1) {
  try { if ((await fetch(`${base}/api/v1/health/ready`)).ok) break; } catch {}
  if (attempt === 99) { managed?.kill("SIGTERM"); throw new Error("Demo did not become ready"); }
  await new Promise(resolve => setTimeout(resolve, 300));
}

const browser = await chromium.launch({ headless: true });
const report = { date: "2026-11-02", scope: "Local Chromium lab traces; not field Web Vitals or real-device evidence", browser: browser.version(), scenarios: [], passed: false };

async function exercise(page, scenario) {
  if (scenario === "select") {
    const trigger = page.getByRole("combobox", { name: "记录类别" });
    for (let index = 0; index < 4; index += 1) {
      await trigger.click();
      await page.getByRole("listbox").waitFor();
      await page.keyboard.press("Escape");
      await page.getByRole("listbox").waitFor({ state: "hidden" });
    }
    return;
  }
  if (scenario === "mobile-navigation") {
    const trigger = page.getByRole("button", { name: "打开导航" });
    for (let index = 0; index < 4; index += 1) {
      await trigger.click();
      await page.getByRole("dialog").waitFor();
      await page.keyboard.press("Escape");
      await page.getByRole("dialog").waitFor({ state: "hidden" });
    }
    return;
  }
  const image = page.locator("main img").first();
  await image.scrollIntoViewIfNeeded();
  for (let index = 0; index < 4; index += 1) {
    await image.click();
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
  }
}

try {
  for (const scenario of ["select", "mobile-navigation", "lightbox"]) {
    for (const rate of [1, 4]) {
      const context = await browser.newContext({ viewport: { width: scenario === "select" ? 1440 : 390, height: scenario === "select" ? 1000 : 844 } });
      const page = await context.newPage();
      const consoleErrors = [];
      page.on("pageerror", error => consoleErrors.push(error.message));
      await page.addInitScript(() => {
        const metrics = { longTasks: [], layoutShifts: [] };
        Object.defineProperty(window, "__daytraceMotionMetrics", { value: metrics });
        try {
          new PerformanceObserver(list => {
            for (const entry of list.getEntries()) metrics.longTasks.push({ startTime: entry.startTime, duration: entry.duration });
          }).observe({ type: "longtask", buffered: false });
          new PerformanceObserver(list => {
            for (const entry of list.getEntries()) metrics.layoutShifts.push({ value: entry.value, hadRecentInput: entry.hadRecentInput, sources: entry.sources?.map(source => ({ tag: source.node?.tagName, className: source.node?.className })) ?? [] });
          }).observe({ type: "layout-shift", buffered: false });
        } catch {}
      });
      const path = scenario === "select" ? "/archive" : scenario === "mobile-navigation" ? "/" : recipe;
      await page.goto(base + path);
      await page.waitForLoadState("networkidle");
      if (scenario === "lightbox") {
        await page.locator("main img").first().scrollIntoViewIfNeeded();
        await page.waitForTimeout(200);
      }
      await page.evaluate(() => {
        window.__daytraceMotionMetrics.longTasks.length = 0;
        window.__daytraceMotionMetrics.layoutShifts.length = 0;
      });
      const cdp = await context.newCDPSession(page);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate });
      const traceEvents = [];
      cdp.on("Tracing.dataCollected", payload => traceEvents.push(...payload.value));
      await cdp.send("Tracing.start", { categories: "devtools.timeline,disabled-by-default-devtools.timeline.frames", transferMode: "ReportEvents" });
      await exercise(page, scenario);
      await page.waitForTimeout(350);
      const complete = new Promise(resolve => cdp.once("Tracing.tracingComplete", resolve));
      await cdp.send("Tracing.end");
      await complete;
      const metrics = await page.evaluate(() => window.__daytraceMotionMetrics);
      const label = `${scenario}-${rate === 1 ? "normal" : "cpu-4x"}`;
      await writeFile(`${evidence}/${label}-trace.json`, JSON.stringify(traceEvents));
      const longRunTasks = traceEvents.filter(event => event.name === "RunTask" && (event.dur ?? 0) >= 50_000).map(event => ({ durationMs: event.dur / 1000, startTime: event.ts }));
      const droppedFrames = traceEvents.filter(event => event.name === "DroppedFrame").length;
      const summary = {
        scenario,
        cpuThrottle: rate,
        trace: `${label}-trace.json`,
        runTasksOver50ms: longRunTasks,
        observerLongTasks: metrics.longTasks,
        droppedFrames,
        layoutCount: traceEvents.filter(event => event.name === "Layout").length,
        updateLayoutTreeCount: traceEvents.filter(event => event.name === "UpdateLayoutTree").length,
        paintCount: traceEvents.filter(event => event.name === "Paint").length,
        layoutShiftScore: metrics.layoutShifts.reduce((total, entry) => total + entry.value, 0),
        unexpectedLayoutShiftScore: metrics.layoutShifts.filter(entry => !entry.hadRecentInput).reduce((total, entry) => total + entry.value, 0),
        consoleErrors,
      };
      summary.passed = longRunTasks.length === 0 && metrics.longTasks.length === 0 && droppedFrames === 0 && summary.unexpectedLayoutShiftScore === 0 && consoleErrors.length === 0;
      report.scenarios.push(summary);
      console.log(`${summary.passed ? "PASS" : "FAIL"} ${label}: ${JSON.stringify({ longRunTasks: longRunTasks.length, observerLongTasks: metrics.longTasks.length, droppedFrames, unexpectedLayoutShiftScore: summary.unexpectedLayoutShiftScore })}`);
      await context.close();
    }
  }
  report.passed = report.scenarios.every(item => item.passed);
  assert.equal(report.passed, true, "A motion scenario exceeded the recorded lab budget");
} finally {
  await writeFile(`${evidence}/motion-results.json`, `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
  managed?.kill("SIGTERM");
}
