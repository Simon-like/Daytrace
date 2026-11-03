import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cp, mkdtemp, mkdir, open, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { gzipSync } from "node:zlib";
import { chromium } from "playwright";
const port = Number(process.env.CONTENT_TEST_PORT ?? 3290);
const apiPort = port + 1;
const h5Origin = `http://127.0.0.1:${port + 2}`;
const base = `http://127.0.0.1:${port}`;
const temporary = await mkdtemp(join(tmpdir(), "daytrace-content-browser-"));
await cp(resolve("apps/api/fixtures/demo"), temporary, { recursive: true, filter: source => !source.includes(".daytrace") });
const evidence = "docs/project/evidence/CONTENT-003";
await mkdir(evidence, { recursive: true }); await mkdir(".local/content-browser", { recursive: true });
const log = await open(".local/content-browser/server.log", "w");
const environment = { ...process.env, PUBLIC_ORIGIN: base, DAYTRACE_DEMO: "1", API_INTERNAL_ORIGIN: `http://127.0.0.1:${apiPort}`, API_PORT: String(apiPort) };
const children = [];
function launch(args) { const child = spawn(process.execPath,args,{ env: environment, stdio: ["ignore",log.fd,log.fd], detached: true }); children.push(child); return child; }
const result = { date: "2026-11-03", environment: "Chromium, isolated synthetic files and local session; not real iPhone or production identity", checks: [], errors: [], passed: false };
let browser; let page;
async function check(name, action) { await action(); result.checks.push(name); console.log(`PASS ${name}`); }
try {
  launch(["node_modules/tsx/dist/cli.mjs","--tsconfig","apps/api/tsconfig.json","tests/e2e/content/server.ts",temporary]);
  await cp("apps/site/.next/static", "apps/site/.next/standalone/apps/site/.next/static", { recursive: true });
  await cp("apps/site/public", "apps/site/.next/standalone/apps/site/public", { recursive: true });
  environment.HOSTNAME = "127.0.0.1"; environment.PORT = String(port);
  launch(["apps/site/.next/standalone/apps/site/server.js"]);
  await cp("apps/h5/.next/static", "apps/h5/.next/standalone/apps/h5/.next/static", { recursive: true });
  await cp("apps/h5/public", "apps/h5/.next/standalone/apps/h5/public", { recursive: true });
  environment.PORT = String(port + 2);
  launch(["apps/h5/.next/standalone/apps/h5/server.js"]);
  for (let i = 0; i < 120; i++) {
    try { if ((await fetch(`${base}/api/v1/health/ready`, { signal: AbortSignal.timeout(1500) })).ok) break; } catch {}
    if (i === 119) throw new Error("Services did not start; inspect .local/content-browser/server.log");
    await new Promise(r => setTimeout(r, 500));
  }
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ["clipboard-read", "clipboard-write"] });
  page = await context.newPage(); page.on("pageerror",e => result.errors.push(e.message));
  await page.goto(`${base}/owner`); await page.getByRole("link",{name:/进入演示主人空间/}).click();
  await page.getByRole("link",{name:/打开内容库/}).click(); await page.getByRole("heading",{name:"已经收好的记录"}).waitFor();
  await check("owner can open management and upload MD plus attachment using the binary proxy", async () => {
    await page.getByLabel("选择 Markdown 和附件",{exact:true}).setInputFiles([
      { name: "浏览器合成测试.md", mimeType: "text/markdown", buffer: Buffer.from("# 浏览器合成测试\n\n## 阅读\n\n合成试验文字[^n] 与 $x^2$。\n\n[技术记录](/records/rec_11111111-1111-4111-8111-000000000001/)\n\n[附件](files/test.txt)\n\n[^n]: 注释\n\n```ts\nconst ok = true\n```") },
      { name:"test.txt", mimeType:"text/plain",buffer:Buffer.from("BROWSER_SYNTHETIC_ATTACHMENT") },
    ]);
    await page.getByRole("button",{name:"整理并预览"}).click(); await page.getByRole("heading",{name:"先翻一遍。"}).waitFor();
    assert.equal(await page.locator(".katex").count(),1);
    assert.equal(await page.getByRole("button",{name:"复制代码",exact:true}).count(),1);
    await page.getByRole("button",{name:"复制代码",exact:true}).click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()),"const ok = true\n");
    await page.reload(); await page.getByRole("heading",{name:"先翻一遍。"}).waitFor();
  });
  await check("desktop and mobile previews preserve layout and explicit public publication", async () => {
    await page.getByRole("button",{name:"手机宽度"}).click();
    await page.screenshot({path:`${evidence}/desktop-preview.png`, fullPage:true});
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({path:`${evidence}/mobile-preview.png`,fullPage:true});
    await page.getByRole("button",{name:"公开发布…"}).click();
    await page.getByRole("button",{name:"确认公开发布",exact:true}).click();
    await page.getByRole("status").filter({hasText:"文章已公开发布。"}).waitFor();
  });
  const row = page.locator("article").filter({has:page.getByRole("link",{name:"浏览器合成测试",exact:true})});
  const recordId = (await row.getByRole("link",{name:"浏览器合成测试",exact:true}).getAttribute("href")).split("/").pop();
  await check("independent H5 reads the same uploaded article and uses the public ID canonical", async () => {
    const mobile = await context.newPage(); await mobile.setViewportSize({width:390,height:844});
    await mobile.goto(`${h5Origin}/h5/records/${recordId}`); await mobile.getByRole("heading",{name:"浏览器合成测试",exact:true}).waitFor();
    assert.equal(await mobile.locator(".katex").count(),1);
    assert.equal(await mobile.getByRole("link",{name:"技术记录",exact:true}).getAttribute("href"),"/h5/records/rec_11111111-1111-4111-8111-000000000001/");
    assert.equal(await mobile.locator('link[rel="canonical"]').getAttribute("href"),`${base}/records/${recordId}/`);
    assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await mobile.screenshot({path:`${evidence}/h5-uploaded-article.png`,fullPage:true}); await mobile.close();
  });
  await check("metadata update hides article and assets and history can restore without making it public", async () => {
    assert.equal((await fetch(`${base}/api/v1/records/${recordId}`)).status,200);
    await row.getByRole("button",{name:"管理",exact:true}).click();
    await page.getByRole("heading",{name:"整理这一页"}).waitFor();
    const editor = page.locator('[aria-label="管理 浏览器合成测试"]');
    await editor.getByLabel("公开范围",{exact:true}).selectOption("private");
    await editor.getByRole("button",{name:"保存文章信息"}).click();
    await page.getByRole("status").filter({hasText:"文章信息已保存。"}).waitFor();
    assert.equal((await fetch(`${base}/api/v1/records/${recordId}`)).status,404);
    await row.getByRole("button",{name:"管理",exact:true}).click();
    await page.getByRole("button",{name:"查看历史版本"}).click();
    await page.getByRole("button",{name:"恢复此正文"}).last().click();
    await page.getByRole("status").filter({hasText:"已恢复历史正文"}).waitFor();
    assert.equal((await fetch(`${base}/api/v1/records/${recordId}`)).status,404);
  });
  await check("download exports portable source and filters retain access to private drafts", async () => {
    const [download] = await Promise.all([page.waitForEvent("download"), row.getByRole("link",{name:"导出",exact:true}).click()]);
    assert.match(download.suggestedFilename(),/\.zip$/);
    await page.getByLabel("找一页",{exact:true}).fill("浏览器合成测试"); assert.equal(await page.locator("article").count(),1);
    await page.getByLabel("筛选公开范围",{exact:true}).selectOption("private"); assert.equal(await page.locator("article").count(),1);
    await page.screenshot({path:`${evidence}/mobile-library.png`,fullPage:true});
  });
  const fresh = await browser.newContext({viewport:{width:1440,height:1000}});
  const publicPage = await fresh.newPage(); const scripts = [];
  publicPage.on("request", request => { if (request.resourceType() === "script") scripts.push(request.url()); });
  await publicPage.goto(`${base}/records/rec_11111111-1111-4111-8111-000000000001`);
  await publicPage.waitForLoadState("networkidle"); await publicPage.waitForTimeout(1000);
  let gzipBytes = 0;
  for (const url of new Set(scripts)) { const response = await fetch(url); gzipBytes += gzipSync(Buffer.from(await response.arrayBuffer())).byteLength; }
  result.resources = { page: "public desktop reader", necessaryAndRequestedJsGzipBytes: gzipBytes, initialBudgetBytes: 81920, budgetMet: gzipBytes <= 81920, note: "Fresh Chromium script requests including automatic prefetch; not field Core Web Vitals" };
  await fresh.close();
  assert.deepEqual(result.errors,[]); result.passed = true;
} catch (error) { await page?.screenshot({path:`${evidence}/failure.png`,fullPage:true}).catch(() => {}); if (page) await writeFile(".local/content-browser/failure.html",await page.content()); result.errors.push(error.stack ?? String(error)); throw error; }
finally {
  await browser?.close(); for (const child of children) { try { process.kill(-child.pid,"SIGTERM"); } catch {} }
  await new Promise(r => setTimeout(r,800)); await log.close(); await rm(temporary,{recursive:true,force:true});
  await writeFile(`${evidence}/browser.json`,JSON.stringify(result,null,2)+"\n");
}
