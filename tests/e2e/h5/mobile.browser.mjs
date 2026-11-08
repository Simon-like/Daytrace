import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, open, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const sitePort = process.env.H5_TEST_SITE_PORT ?? "3170";
const apiPort = process.env.H5_TEST_API_PORT ?? "3171";
const h5Port = process.env.H5_TEST_H5_PORT ?? "3172";
const base = `http://127.0.0.1:${sitePort}`;
const direct = `http://127.0.0.1:${h5Port}`;
const evidence = process.env.H5_TEST_EVIDENCE_DIR ?? "docs/project/evidence/MOBILE-001";
await mkdir(evidence, { recursive: true });
await mkdir(".local/h5-test", { recursive: true });
const log = await open(".local/h5-test/server.log", "w");
const managed = spawn(process.execPath, ["scripts/dev/run-dev.mjs", "--port", sitePort, "--h5-port", h5Port, "--demo"], {
  env: { ...process.env, API_PORT: apiPort, CONTENT_ROOT: "apps/api/fixtures/demo", DAYTRACE_DEMO: "1", PUBLIC_ORIGIN: base },
  stdio: ["ignore", log.fd, log.fd],
});
for (let attempt = 0; attempt < 150; attempt += 1) {
  try { if ((await fetch(`${base}/api/v1/health/ready`)).ok && (await fetch(`${base}/h5/`)).ok) break; } catch {}
  if (attempt === 149) { managed.kill("SIGTERM"); throw new Error("H5 services did not become ready"); }
  await new Promise(resolve => setTimeout(resolve, 300));
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, permissions: ["clipboard-read", "clipboard-write"] });
const page = await context.newPage();
const report = { date: "2026-11-03", scope: "Independent H5 in Chromium mobile viewports; not a real iPhone", checks: [], layouts: [], errors: [], passed: false };
page.on("pageerror", error => report.errors.push(error.message));
const tech = "/h5/records/rec_11111111-1111-4111-8111-000000000001";
const recipe = "/h5/records/rec_11111111-1111-4111-8111-000000000002";
async function go(path) { const response = await page.goto(base + path); await page.waitForLoadState("networkidle"); return response; }
async function check(name, run) { try { await run(); report.checks.push({ name, passed: true }); console.log(`PASS ${name}`); } catch (error) { report.checks.push({ name, passed: false, error: error.message }); console.error(`FAIL ${name}: ${error.message}`); await page.screenshot({ path: `${evidence}/failure-${report.checks.length}.png`, fullPage: true }).catch(() => {}); } }

try {
  await check("basePath, shared assets and direct H5 API proxy work", async () => {
    const response = await go("/h5/");
    assert.equal(response.status(), 200);
    assert.ok((await page.locator("main").textContent()).includes("把日常"));
    assert.equal((await fetch(`${base}/h5/brand/daytrace-icon-reverse.svg`)).status, 200);
    assert.equal((await fetch(`${direct}/h5/`)).status, 200);
    assert.equal((await fetch(`${direct}/api/v1/health/ready`)).status, 200);
    assert.equal(await page.locator(".h5-tabs a").count(), 5);
    const detailHtml = await (await fetch(base + tech)).text();
    const canonicalId = tech.split("/").at(-1);
    assert.ok(detailHtml.includes(`rel="canonical" href="${base}/records/${canonicalId}/"`));
    assert.ok(detailHtml.includes(`property="og:url" content="${base}/records/${canonicalId}/"`));
    assert.ok(detailHtml.includes(`property="og:image" content="${base}/records/${canonicalId}/opengraph-image"`));
    assert.ok(detailHtml.includes(`name="twitter:card" content="summary_large_image"`));
    assert.ok(detailHtml.includes(`href="${base}/rss.xml"`));
    assert.ok(!detailHtml.includes("写给自己的阶段提醒"));
  });
  await check("mobile navigation and bottom filter sheet preserve touch and scroll state", async () => {
    await page.locator(".h5-tabs").getByRole("link", { name: "归档" }).click();
    await page.waitForURL(/\/h5\/archive/);
    const trigger = page.getByRole("button", { name: /筛选记录/ });
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    assert.equal(await page.evaluate(() => document.body.style.overflow), "hidden");
    await page.getByRole("combobox", { name: "记录类别" }).click();
    await page.getByRole("listbox").getByRole("option", { name: "生活经验" }).click();
    await page.getByRole("button", { name: "查看记录" }).click();
    await page.waitForURL(/type=recipe/);
    await dialog.waitFor({ state: "hidden" });
    assert.notEqual(await page.evaluate(() => document.body.style.overflow), "hidden");
    await page.getByText("麻婆豆腐：把这次的火候留下来", { exact: true }).waitFor();
    assert.ok(!(await page.locator(".h5-records").textContent()).includes("微前端接入"));
    await page.getByRole("link", { name: "麻婆豆腐：把这次的火候留下来" }).click();
    await page.waitForURL(/\/h5\/records\//);
    await page.goBack();
    await page.waitForLoadState("networkidle");
    assert.match(page.url(), /type=recipe/);
    await page.waitForFunction(() => document.querySelector(".h5-filter-trigger")?.textContent?.includes("1"));
    assert.match(await page.getByRole("button", { name: /筛选记录/ }).textContent(), /1/);
  });
  await check("sheet Escape, repeated opening and reduced motion are immediate", async () => {
    await go("/h5/archive");
    const trigger = page.getByRole("button", { name: /筛选记录/ });
    await trigger.click();
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(await trigger.evaluate(node => node === document.activeElement), true);
    await trigger.click();
    assert.equal(await page.getByRole("dialog").count(), 1);
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(await page.getByRole("dialog").evaluate(node => getComputedStyle(node).transitionDuration), "0s");
    assert.equal(await page.locator(".dt-scene-title").evaluate(node => getComputedStyle(node).animationName), "none");
    await page.keyboard.press("Escape");
    await page.emulateMedia({ reducedMotion: "no-preference" });
  });
  await check("search submit, clear, suggestions and result navigation work under /h5", async () => {
    await go("/h5/search");
    const input = page.getByRole("searchbox");
    await input.fill("豆腐");
    await page.getByLabel("搜索记录类型").selectOption("recipe");
    await page.getByRole("button", { name: "搜索", exact: true }).click();
    await page.getByRole("link", { name: "麻婆豆腐：把这次的火候留下来" }).waitFor();
    assert.match(page.url(), /searchType=recipe/);
    await page.reload();
    await page.getByRole("link", { name: "麻婆豆腐：把这次的火候留下来" }).waitFor();
    assert.equal(await page.getByLabel("搜索记录类型").inputValue(), "recipe");
    await page.getByRole("button", { name: "清除搜索" }).click();
    assert.equal(await input.inputValue(), "");
    await page.getByRole("link", { name: "#豆腐" }).click();
    await page.getByRole("link", { name: "麻婆豆腐：把这次的火候留下来" }).waitFor();
    await page.getByRole("link", { name: "麻婆豆腐：把这次的火候留下来" }).click();
    await page.waitForURL(/\/h5\/records\/rec_/);
  });
  await check("owner login, linked recipe practices, private search, reader, expiry and logout stay within H5", async () => {
    const privateId = "rec_11111111-1111-4111-8111-000000000091";
    const secondId = "rec_11111111-1111-4111-8111-000000000093";
    const secondTitle = "第二次麻婆豆腐实践：只改变豆腐";
    await go(recipe);
    assert.ok(!(await page.locator("main").textContent()).includes(secondTitle));
    assert.ok(!(await page.locator("main").innerHTML()).includes(secondId));
    await go("/h5/owner/content");
    await page.waitForURL(/\/h5\/owner\/?$/);
    await page.getByRole("link", { name: "进入演示主人空间" }).click();
    await page.waitForURL(/\/h5\/owner$/);
    await page.getByRole("button", { name: "退出主人空间" }).waitFor();
    await page.getByRole("link", { name: "打开内容库" }).click();
    await page.getByRole("heading", { name: /写好的/ }).waitFor();
    await page.getByRole("searchbox", { name: "找一页" }).fill("阶段提醒");
    await page.getByRole("link", { name: "写给自己的阶段提醒" }).waitFor();
    await page.getByRole("link", { name: "← 主人空间" }).click();
    await go(recipe.replace("/h5/records/", "/h5/owner/records/"));
    const comparison = page.getByRole("region", { name: "跨次实践" });
    await comparison.waitFor();
    assert.deepEqual(await comparison.getByRole("link").allTextContents(), ["麻婆豆腐：把这次的火候留下来", secondTitle]);
    for (const width of [390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      const layout = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
      report.layouts.push({ width, path: "/h5/owner/records/recipe-comparison", ...layout, passed: layout.scroll <= width + 1 });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const secondLink = comparison.getByRole("link", { name: secondTitle });
    await secondLink.focus();
    await page.keyboard.press("Enter");
    await page.waitForURL(new RegExp(`/h5/owner/records/${secondId}/?$`));
    await page.getByText("老豆腐更容易保持形状", { exact: false }).waitFor();
    await go("/h5/owner");
    const input = page.getByRole("searchbox");
    await input.fill("阶段提醒");
    await page.getByLabel("搜索记录状态").selectOption("published");
    await page.getByLabel("搜索公开范围").selectOption("private");
    await page.getByRole("button", { name: "搜索", exact: true }).click();
    const results = page.getByRole("list", { name: "主人搜索结果" });
    await results.getByRole("link", { name: "写给自己的阶段提醒" }).waitFor();
    assert.equal((await (await context.request.get(`${base}/api/v1/search?q=${encodeURIComponent("阶段提醒")}`)).json()).data.items.length, 0);
    await results.getByRole("link", { name: "写给自己的阶段提醒" }).click();
    await page.waitForURL(new RegExp(`/h5/owner/records/${privateId}/?$`));
    await page.getByText("这份记录只在主人演示空间可见。", { exact: false }).waitFor();
    for (const width of [390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      const layout = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
      report.layouts.push({ width, path: "/h5/owner/records/private", ...layout, passed: layout.scroll <= width + 1 });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `${evidence}/owner-reader-390.png`, fullPage: true, animations: "disabled" });
    await go("/h5/owner");
    await input.fill("阶段提醒");
    await page.getByRole("button", { name: "搜索", exact: true }).click();
    await results.getByRole("link", { name: "写给自己的阶段提醒" }).waitFor();
    await page.route("**/api/v1/search?*scope=owner*", route => route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ schemaVersion: "1.0", error: { code: "AUTH_REQUIRED", message: "synthetic expired", requestId: "h5-expired", details: [] } }) }));
    await input.fill("会话失效");
    await page.getByRole("button", { name: "搜索", exact: true }).click();
    await page.getByRole("link", { name: "重新登录主人空间" }).waitFor();
    assert.equal(await page.getByRole("list", { name: "主人搜索结果" }).count(), 0);
    await page.unroute("**/api/v1/search?*scope=owner*");
    await page.getByRole("button", { name: "退出主人空间" }).click();
    await page.waitForURL(/\/h5\/owner$/);
    await page.getByRole("link", { name: "进入演示主人空间" }).waitFor();
    assert.ok(!(await page.locator("body").textContent()).includes("这份记录只在主人演示空间可见"));
  });
  await check("server Markdown, code copy, local overflow and image lightbox work", async () => {
    await go(tech);
    assert.equal(await page.locator("[data-reader-code]").count(), 2);
    assert.equal(await page.locator("[data-reader-table]").count(), 1);
    const bodyFont = () => page.locator(".h5-reader-body").evaluate(node => getComputedStyle(node).fontSize);
    assert.equal(await bodyFont(), "17px");
    await page.getByRole("button", { name: "较大", exact: true }).click();
    assert.equal(await bodyFont(), "19px");
    assert.equal(await page.getByRole("button", { name: "较大", exact: true }).getAttribute("aria-pressed"), "true");
    await go(tech.replace("/h5", ""));
    assert.equal(await page.getByRole("button", { name: "较大", exact: true }).getAttribute("aria-pressed"), "true");
    assert.equal(await page.evaluate(() => localStorage.getItem("daytrace.readingFontSize.v1")), "large");
    await go(tech);
    await page.reload();
    await page.waitForLoadState("networkidle");
    assert.equal(await bodyFont(), "19px");
    await page.evaluate(() => localStorage.setItem("daytrace.readingFontSize.v1", "invalid"));
    await page.reload();
    await page.waitForLoadState("networkidle");
    assert.equal(await bodyFont(), "17px");
    const xlarge = page.getByRole("button", { name: "特大", exact: true });
    await xlarge.focus();
    await page.keyboard.press("Space");
    assert.equal(await bodyFont(), "21px");
    for (const width of [390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    }
    await page.getByRole("button", { name: "标准", exact: true }).click();
    const longPre = page.locator("[data-reader-code-scroll]").nth(1);
    assert.equal(await longPre.evaluate(node => node.scrollWidth > node.clientWidth), true);
    await page.getByRole("button", { name: "复制代码", exact: true }).first().click();
    await page.getByRole("button", { name: "已复制", exact: true }).waitFor();
    assert.ok((await page.evaluate(() => navigator.clipboard.readText())).includes("registerMicroApps"));
    await go(recipe);
    const image = page.locator("[data-reader-image] img").first();
    await image.scrollIntoViewIfNeeded();
    await image.click();
    await page.getByRole("dialog", { name: "查看正文图片" }).waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const staticPage = await noJs.newPage();
    await staticPage.goto(base + tech);
    await staticPage.getByText("registerMicroApps", { exact: false }).first().waitFor();
    assert.equal(await staticPage.locator("[data-reader-table]").count(), 1);
    await noJs.close();
  });
  for (const width of [320, 390, 430, 768]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ["/h5/", "/h5/archive", "/h5/search", "/h5/about", tech, recipe]) {
      await go(path);
      const layout = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, tabHeight: document.querySelector(".h5-tabs")?.getBoundingClientRect().height ?? 0 }));
      report.layouts.push({ width, path, ...layout, passed: layout.scroll <= width + 1 && layout.tabHeight >= 59 });
    }
  }
  for (const [name, path, width] of [["home-390", "/h5/", 390], ["archive-390", "/h5/archive", 390], ["search-390", "/h5/search?q=豆腐", 390], ["reader-390", tech, 390], ["home-320", "/h5/", 320], ["home-768", "/h5/", 768]]) {
    await page.setViewportSize({ width, height: 844 });
    await go(path);
    await page.screenshot({ path: `${evidence}/${name}.png`, fullPage: true, animations: "disabled" });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await go("/h5/archive");
  await page.getByRole("button", { name: /筛选记录/ }).click();
  await page.screenshot({ path: `${evidence}/filter-sheet-390.png`, animations: "disabled" });
  await page.keyboard.press("Escape");
  report.passed = report.checks.every(item => item.passed) && report.layouts.every(item => item.passed) && report.errors.length === 0;
} finally {
  await writeFile(`${evidence}/browser-results.json`, JSON.stringify(report, null, 2) + "\n");
  await browser.close();
  managed.kill("SIGTERM");
  await new Promise(resolve => setTimeout(resolve, 700));
}
console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, layouts: report.layouts.length, failures: report.checks.filter(item => !item.passed), layoutFailures: report.layouts.filter(item => !item.passed), errors: report.errors }, null, 2));
if (!report.passed) process.exitCode = 1;
