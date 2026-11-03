import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.READER_TEST_BASE_URL ?? "http://127.0.0.1:3000";
const tech = "/records/rec_11111111-1111-4111-8111-000000000001";
const evidence = "docs/project/evidence/READER-003";
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const report = { date: "2026-11-03", scope: "Chromium desktop reader; not a real Safari device", checks: [], errors: [], passed: false };
page.on("pageerror", error => report.errors.push(error.message));
const activeText = () => page.locator("aside").getByRole("navigation", { name: "本文目录" }).locator('a[aria-current="location"]').textContent();
async function scrollToHeading(name) {
  await page.getByRole("heading", { name, exact: true }).evaluate(heading => {
    window.scrollTo({ top: window.scrollY + heading.getBoundingClientRect().top - 120, behavior: "instant" });
  });
}
async function waitActive(name) {
  try {
    await page.waitForFunction(expected => document.querySelector('aside a[aria-current="location"]')?.textContent === expected, name, { timeout: 5000 });
  } catch {
    const state = await page.evaluate(() => ({ active: document.querySelector('aside a[aria-current="location"]')?.textContent, y: scrollY, height: innerHeight, headings: [...document.querySelectorAll("h2, h3")].map(heading => ({ text: heading.textContent, top: heading.getBoundingClientRect().top })) }));
    throw new Error(`Expected active “${name}”: ${JSON.stringify(state)}`);
  }
  assert.equal(await activeText(), name);
}
async function check(name, run) {
  try { await run(); report.checks.push({ name, passed: true }); console.log(`PASS ${name}`); }
  catch (error) { report.checks.push({ name, passed: false, error: error.message }); console.error(`FAIL ${name}: ${error.message}`); }
}

try {
  await check("desktop outline follows downward, upward and document-end reading positions", async () => {
    await page.goto(base + tech);
    await page.waitForLoadState("networkidle");
    await waitActive("先画清楚，谁负责什么");
    await scrollToHeading("一个白屏问题的排查顺序");
    await waitActive("一个白屏问题的排查顺序");
    await page.screenshot({ path: `${evidence}/toc-scroll-active.png`, fullPage: false, animations: "disabled" });
    await scrollToHeading("把注册配置当作地图");
    await waitActive("把注册配置当作地图");
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    await waitActive("后来补充");
    await page.screenshot({ path: `${evidence}/toc-scroll-end.png`, fullPage: false, animations: "disabled" });
  });
  await check("outline click still updates the hash and active location", async () => {
    const nav = page.locator("aside").getByRole("navigation", { name: "本文目录" });
    await nav.getByRole("link", { name: "把注册配置当作地图", exact: true }).click();
    await waitActive("把注册配置当作地图");
    assert.ok(new URL(page.url()).hash.length > 1);
  });
  report.passed = report.checks.every(item => item.passed) && report.errors.length === 0;
} finally {
  await writeFile(`${evidence}/browser-results.json`, JSON.stringify(report, null, 2) + "\n");
  await browser.close();
}
console.log(JSON.stringify({ passed: report.passed, checks: report.checks, errors: report.errors }, null, 2));
if (!report.passed) process.exitCode = 1;
