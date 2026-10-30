import path from 'node:path';
import fs from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const modulePath=process.env.MODULE_DESIGN_PLAYWRIGHT||path.resolve(root,'../2026-10-30-kimi-themes-v3/node_modules/playwright/index.mjs');
const {chromium}=await import(pathToFileURL(modulePath));
const base=process.env.MODULE_DESIGN_URL||'http://127.0.0.1:7300';
const out=path.join(root,'previews');
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({locale:'zh-CN',permissions:['clipboard-read','clipboard-write'],deviceScaleFactor:1});
const page=await context.newPage();
const errors=[];
page.on('pageerror',err=>errors.push(err.message));
const report={environment:{browser:browser.version(),engine:'Chromium',realIPhone:false,base,date:new Date().toISOString()},layout:[],interactions:[],errors};
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
const widths=[320,360,390,430,768,979,980,981,1024,1179,1180,1181,1440];
const pages=['home','archive','tech','recipe','thought','about','404'];
try {
  for(const width of widths) {
    await page.setViewportSize({width,height:width<760?844:1000});
    for(const route of pages) {
      await page.goto(`${base}/?page=${route}`,{waitUntil:'networkidle'});
      await page.locator('main h1').waitFor();
      await page.evaluate(()=>document.fonts.ready);
      const measure=await page.evaluate(()=>({
        width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
        title:document.querySelector('h1').textContent,
        brokenImages:[...document.querySelectorAll('img[src]')].filter(x=>x.getAttribute('src')&&(!x.complete||!x.naturalWidth)).map(x=>x.getAttribute('src')),
        crampedDiagram:[...document.querySelectorAll('.flow-path strong,.flow-path small')].filter(x=>x.scrollWidth>x.clientWidth+1).length,
        bodyFont:getComputedStyle(document.querySelector('.prose')||document.body).fontSize
      }));
      report.layout.push({page:route,...measure,passed:measure.scrollWidth<=width+1&&measure.brokenImages.length===0});
      assert(measure.scrollWidth<=width+1,`Horizontal overflow ${route}@${width}: ${measure.scrollWidth}`);
      assert(!measure.brokenImages.length,`Missing images ${route}@${width}: ${measure.brokenImages}`);
      assert(measure.crampedDiagram===0,`Diagram labels too wide ${route}@${width}`);
      if(width===1440||width===390) {
        await page.screenshot({path:path.join(out,`${route}-${width===1440?'desktop':'mobile'}.png`)});
      }
    }
  }
  await page.setViewportSize({width:390,height:844});
  await page.goto(`${base}/?page=tech`);
  await page.locator('.mobile-toc summary').click();
  assert(await page.locator('.mobile-toc').getAttribute('open')!==null,'Mobile TOC did not open');
  await page.locator('.mobile-toc a[href="#verify"]').click();
  await page.waitForTimeout(100);
  assert(await page.locator('.mobile-toc').getAttribute('open')===null,'TOC did not close');
  const headingTop=await page.locator('#verify').evaluate(el=>el.getBoundingClientRect().top);
  assert(headingTop>=65&&headingTop<160,`Heading covered / missed: ${headingTop}`);
  report.interactions.push({name:'mobile TOC and visible anchor',passed:true,headingTop});
  const table=page.locator('.table-wrap');
  const overflow=await table.evaluate(el=>{el.scrollLeft=120;return {width:el.clientWidth,scroll:el.scrollWidth,left:el.scrollLeft};});
  assert(overflow.scroll>overflow.width&&overflow.left>0,'Wide table not locally scrollable');
  report.interactions.push({name:'local wide-table scroll',passed:true,...overflow});
  await page.locator('[data-copy]').first().click();
  const copied=await page.evaluate(()=>navigator.clipboard.readText());
  assert(copied.includes('registerMicroApps')&&!copied.includes('复制代码'),'Clipboard contains wrong text');
  report.interactions.push({name:'code copy contents',passed:true});
  await page.locator('.mobile-actions [data-open-search]').click();
  await page.locator('#global-search').fill('豆腐');
  assert(await page.locator('#search-results h3').count()===1,'Search fixture mismatch');
  await page.keyboard.press('Escape');
  assert(!await page.locator('#search-dialog').isVisible(),'Escape with filled search did not close dialog');
  await page.locator('.mobile-actions [data-open-search]').click();
  await page.locator('#global-search').fill('does-not-exist-987');
  await page.locator('#clear-global-search').waitFor();
  await page.locator('#clear-global-search').click();
  assert(await page.locator('#search-results h3').count()===6,'Clear search did not restore records');
  await page.keyboard.press('Escape');
  assert(!await page.locator('#search-dialog').isVisible(),'Search Escape did not close');
  assert(await page.evaluate(()=>document.activeElement?.hasAttribute('data-open-search')),'Search did not return focus');
  report.interactions.push({name:'search / no results / clear / Escape / focus restore',passed:true});
  await page.locator('[data-open-menu]').click();
  assert(await page.locator('#menu-dialog').isVisible(),'Menu not visible');
  await page.keyboard.press('Escape');
  assert(await page.evaluate(()=>document.body.style.overflow===''),'Scroll lock not restored');
  report.interactions.push({name:'mobile menu open / Escape / scroll unlock',passed:true});
  await page.goto(`${base}/?page=recipe`);
  await page.locator('[data-image]').click();
  assert(await page.locator('#image-dialog').isVisible(),'Image did not open');
  await page.keyboard.press('Escape');
  assert(await page.evaluate(()=>document.activeElement?.hasAttribute('data-image')),'Image focus not restored');
  report.interactions.push({name:'image detail / close / focus restore',passed:true});
  await page.goto(`${base}/?page=archive&category=${encodeURIComponent('生活经验')}&q=${encodeURIComponent('豆腐')}`);
  assert(await page.locator('.record-row').count()===1,'Combined category and query wrong');
  await page.locator('.filter-status a').click();
  assert(await page.locator('.record-row').count()===6,'Clear archive filters failed');
  report.interactions.push({name:'archive category + query + clear',passed:true});
  await page.goto(`${base}/?page=archive`);
  await page.evaluate(()=>window.scrollTo(0,450));
  const initialScroll=await page.evaluate(()=>window.scrollY);
  await page.locator('.record-row').first().getByRole('link').click();
  assert(new URL(page.url()).searchParams.get('page')==='tech','Native link did not navigate');
  await page.goBack();
  await page.locator('.record-row').first().waitFor();
  await page.waitForTimeout(150);
  assert(new URL(page.url()).searchParams.get('page')==='archive','Browser back failed');
  const restoredScroll=await page.evaluate(()=>window.scrollY);
  assert(Math.abs(restoredScroll-initialScroll)<25,`Back scroll not restored: ${initialScroll} -> ${restoredScroll}`);
  report.interactions.push({name:'native links, browser back and list scroll restore',passed:true,initialScroll,restoredScroll});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('.mobile-actions [data-open-search]').click();
  const animation=await page.locator('#search-dialog').evaluate(el=>getComputedStyle(el).animationName);
  assert(animation==='none','Reduced-motion dialog still animated');
  await page.keyboard.press('Escape');
  report.interactions.push({name:'reduced motion equivalent dialog',passed:true});
  await page.goto(`${base}/?page=archive&q=%3Cscript%3Ebad%3C%2Fscript%3E`);
  assert(await page.locator('main script').count()===0,'Search query became script markup');
  report.interactions.push({name:'query rendered as text',passed:true});
  assert(errors.length===0,`Page errors: ${errors.join('; ')}`);
  report.passed=true;
} catch(err) {
  report.passed=false;
  report.failure=err.message;
  console.error(err.stack);
  process.exitCode=1;
} finally {
  await fs.writeFile(path.join(out,'validation.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({passed:report.passed,layoutChecks:report.layout.length,interactions:report.interactions.length,errors:report.errors,failure:report.failure}));
  await browser.close();
}
