import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const {chromium}=await import(pathToFileURL(process.env.MODULE_DESIGN_PLAYWRIGHT||path.resolve(root,'../2026-10-30-kimi-themes-v3/node_modules/playwright/index.mjs')));
const browser=await chromium.launch({headless:true});
try {
 const context=await browser.newContext({viewport:{width:390,height:844},locale:'zh-CN'});
 const page=await context.newPage();
 await page.goto('http://127.0.0.1:7300/?page=home');
 await page.locator('.mobile-actions [data-open-search]').click();
 await page.locator('#global-search').fill('豆腐');
 await page.screenshot({path:path.join(root,'previews/search-mobile.png')});
 await page.keyboard.press('Escape');
 await page.locator('[data-open-menu]').click();
 await page.screenshot({path:path.join(root,'previews/menu-mobile.png')});
 await page.keyboard.press('Escape');
 await page.goto('http://127.0.0.1:7300/?page=tech');
 await page.locator('.mobile-toc summary').click();
 await page.screenshot({path:path.join(root,'previews/toc-mobile.png')});
 await page.locator('.mobile-toc a[href="#verify"]').click();
 await page.screenshot({path:path.join(root,'previews/table-mobile.png')});
 await page.goto('http://127.0.0.1:7300/?page=recipe');
 await page.locator('.recipe-layout').scrollIntoViewIfNeeded();
 await page.screenshot({path:path.join(root,'previews/recipe-steps-mobile.png')});
 await page.setViewportSize({width:1600,height:1240});
 for(const name of ['home','archive','tech','recipe','thought']) {
  await page.goto('http://127.0.0.1:7300/review.html',{waitUntil:'networkidle'});
  await page.locator(`[data-page="${name}"]`).click();
  await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
  await page.screenshot({path:path.join(root,`previews/board-${name}.png`),fullPage:true});
 }
 console.log('Captured 5 state previews and 5 module boards.');
} finally {await browser.close();}
