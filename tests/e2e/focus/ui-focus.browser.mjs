import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, open, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const sitePort = process.env.FOCUS_TEST_SITE_PORT ?? "3180";
const apiPort = process.env.FOCUS_TEST_API_PORT ?? "3181";
const h5Port = process.env.FOCUS_TEST_H5_PORT ?? "3182";
const base = process.env.FOCUS_TEST_BASE_URL ?? `http://127.0.0.1:${sitePort}`;
const evidence = "docs/project/evidence/UI-003";
await mkdir(evidence, { recursive: true });
await mkdir(".local/focus-test", { recursive: true });
let managed;
if (!process.env.FOCUS_TEST_BASE_URL) {
  const log = await open(".local/focus-test/server.log", "w");
  managed = spawn(process.execPath, ["scripts/dev/run-dev.mjs", "--port", sitePort, "--h5-port", h5Port], {
    env: { ...process.env, API_PORT: apiPort, CONTENT_ROOT: "apps/api/fixtures/demo", DAYTRACE_DEMO: "1" },
    stdio: ["ignore", log.fd, log.fd],
  });
}
for (let attempt = 0; attempt < 150; attempt += 1) {
  try { if ((await fetch(`${base}/api/v1/health/ready`)).ok && (await fetch(`${base}/h5/`)).ok) break; } catch {}
  if (attempt === 149) { managed?.kill("SIGTERM"); throw new Error("Focus test services did not become ready"); }
  await new Promise(resolve => setTimeout(resolve, 300));
}

const browser = await chromium.launch({ headless: true });
const report = { date: "2026-11-03", scope: "Chromium desktop and mobile viewport; not a real iPhone", checks: [], errors: [], passed: false };
async function check(name, run) {
  try { await run(); report.checks.push({ name, passed: true }); console.log(`PASS ${name}`); }
  catch (error) { report.checks.push({ name, passed: false, error: error.message }); console.error(`FAIL ${name}: ${error.message}`); }
}

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  desktop.on("pageerror", error => report.errors.push(error.message));
  await check("desktop search has one soft container focus and a visible keyboard ring", async () => {
    await desktop.goto(`${base}/search`);
    await desktop.waitForLoadState("networkidle");
    const input = desktop.getByRole("searchbox");
    await input.click();
    await desktop.waitForTimeout(250);
    assert.equal(await input.evaluate(node => getComputedStyle(node).outlineStyle), "none");
    const shadow = await input.evaluate(node => getComputedStyle(node.closest("form")).boxShadow);
    assert.match(shadow, /rgba\(215, 224, 209/);
    await desktop.screenshot({ path: `${evidence}/search-focus-1440.png`, fullPage: true, animations: "disabled" });
    await input.press("Tab");
    const button = desktop.getByRole("button", { name: "搜索", exact: true });
    assert.equal(await button.evaluate(node => node === document.activeElement), true);
    assert.equal(await button.evaluate(node => getComputedStyle(node).outlineColor), "rgb(104, 126, 97)");
    assert.equal(await button.evaluate(node => getComputedStyle(node).outlineStyle), "solid");
  });
  await desktop.close();

  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mobile = await context.newPage();
  mobile.on("pageerror", error => report.errors.push(error.message));
  await check("H5 search removes the double outline and exposes search keyboard semantics", async () => {
    await mobile.goto(`${base}/h5/search`);
    await mobile.waitForLoadState("networkidle");
    const input = mobile.getByRole("searchbox");
    assert.equal(await input.getAttribute("enterkeyhint"), "search");
    await input.focus();
    await mobile.waitForTimeout(250);
    assert.equal(await input.evaluate(node => node === document.activeElement), true);
    const desk = mobile.locator(".h5-search-desk");
    assert.equal(await desk.evaluate(node => getComputedStyle(node).outlineStyle), "none");
    assert.match(await desk.evaluate(node => getComputedStyle(node).boxShadow), /rgba\(104, 126, 97, 0\.18\)/);
    await mobile.screenshot({ path: `${evidence}/search-focus-390.png`, fullPage: true, animations: "disabled" });
    await input.fill("豆腐");
    await mobile.getByRole("button", { name: "搜索", exact: true }).click();
    await mobile.waitForURL(/\/h5\/search\?q=/);
    assert.equal(await input.evaluate(node => node === document.activeElement), false);
    await mobile.getByRole("button", { name: "清除搜索" }).click();
    assert.equal(await input.evaluate(node => node === document.activeElement), true);
  });
  await context.close();
  report.passed = report.checks.every(item => item.passed) && report.errors.length === 0;
} finally {
  await writeFile(`${evidence}/browser-results.json`, JSON.stringify(report, null, 2) + "\n");
  await browser.close();
  managed?.kill("SIGTERM");
  await new Promise(resolve => setTimeout(resolve, 700));
}
console.log(JSON.stringify({ passed: report.passed, checks: report.checks, errors: report.errors }, null, 2));
if (!report.passed) process.exitCode = 1;
