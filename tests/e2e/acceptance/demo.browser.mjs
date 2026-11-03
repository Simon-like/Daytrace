import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir, writeFile, open } from "node:fs/promises";
import { spawn } from "node:child_process";
import { gzipSync } from "node:zlib";
const port=process.env.DEMO_PORT??"3000";
const apiPort=process.env.DEMO_API_PORT??"3001";
const base=process.env.DEMO_BASE_URL??`http://127.0.0.1:${port}`;
const evidence=process.env.DEMO_EVIDENCE_DIR??"docs/project/evidence/DEMO-001";
await mkdir(evidence,{recursive:true});
let managed;
if(process.env.DEMO_MANAGED_SERVER==="1"){
  const log=await open(".local/demo-handoff/browser-server.log","w").catch(async()=>{await mkdir(".local/demo-handoff",{recursive:true});return open(".local/demo-handoff/browser-server.log","w");});
  managed=spawn(process.execPath,["scripts/demo/run-demo.mjs","--skip-build","--port",port,"--api-port",apiPort],{stdio:["ignore",log.fd,log.fd]});
}
for(let attempt=0;attempt<100;attempt++){
  try{if((await fetch(`${base}/api/v1/health/ready`)).ok)break;}catch{}
  if(attempt===99){managed?.kill("SIGTERM");throw new Error("Demo did not become ready");}
  await new Promise(resolve=>setTimeout(resolve,300));
}
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},permissions:["clipboard-read","clipboard-write"]});
const page=await context.newPage();
const report={date:"2026-11-02",scope:"Local functional demo; performance budget, real-device and production acceptance are separate",formalReleaseReady:false,base,browser:browser.version(),data:"synthetic demonstration content only",checks:[],layouts:[],consoleErrors:[],resources:null,realIphone:"not tested",production:"not deployed"};
page.on("pageerror",error=>report.consoleErrors.push(error.message));
const tech="/records/rec_11111111-1111-4111-8111-000000000001";
const recipe="/records/rec_11111111-1111-4111-8111-000000000002";
const thought="/records/rec_11111111-1111-4111-8111-000000000003";
const privateId="rec_11111111-1111-4111-8111-000000000091";
const secret="把没想清楚的部分，也安心留在这里。";
async function check(name,run){try{await run();report.checks.push({name,passed:true});console.log(`PASS ${name}`);}catch(error){report.checks.push({name,passed:false,error:error.message});console.error(`FAIL ${name}: ${error.message}`);await page.screenshot({path:`${evidence}/failure-${report.checks.length}.png`,fullPage:true}).catch(()=>{});}}
async function go(path){const result=await page.goto(base+path);await page.waitForLoadState("networkidle");return result;}
async function waitForText(text){await page.getByText(text,{exact:false}).first().waitFor();}
try{
 await check("server HTML contains actual Markdown, public private boundary and scoped proxy",async()=>{
  const html=await(await fetch(base+tech)).text();assert.ok(html.includes("registerMicroApps"));assert.ok(!html.includes(secret));
  assert.equal((await fetch(`${base}/api/v1/records/${privateId}`)).status,404);
  assert.equal((await fetch(`${base}/api/v1/records?scope=owner`)).status,401);
  assert.equal((await fetch(`${base}/api/v1/assets/ast_11111111-1111-4111-8111-000000009101`)).status,404);
  assert.equal((await fetch(`${base}/api/v1/not-an-allowed-route`)).status,404);
 });
 await check("home categories navigate to a live filtered archive",async()=>{
  await go("/");await page.getByRole("link",{name:/生活经验/}).click();
  await page.waitForURL(/archive\?type=recipe/);const category=page.getByRole("combobox",{name:"记录类别"});await category.waitFor();
  assert.match(await category.textContent(),/生活经验/);
  await waitForText("一锅菌菇饭");
  await category.click();await page.getByRole("listbox").getByRole("option",{name:"技术实践"}).click();await page.getByRole("button",{name:"应用筛选"}).click();
  await waitForText("看陌生代码时");assert.ok(!await page.locator("main").textContent().then(s=>s.includes("一锅菌菇饭")));
  await page.getByRole("button",{name:"清除筛选"}).click();await waitForText("一锅菌菇饭");
 });
 await check("local Select, progressive tags and search focus support keyboard interaction",async()=>{
  await go("/archive");const category=page.getByRole("combobox",{name:"记录类别"});
  const selectStyle=await category.evaluate(node=>{const style=getComputedStyle(node);return{background:style.backgroundColor,color:style.color,radius:style.borderRadius,height:style.height};});
  assert.equal(selectStyle.background,"rgb(233, 237, 228)");assert.equal(selectStyle.color,"rgb(32, 39, 32)");assert.equal(selectStyle.radius,"14px");assert.equal(selectStyle.height,"48px");
  const filterStyle=await page.locator("form[aria-label='筛选公开记录']").evaluate(node=>({border:getComputedStyle(node).borderBottomWidth,radius:getComputedStyle(node).borderRadius}));assert.equal(filterStyle.border,"1px");assert.equal(filterStyle.radius,"20px");
  assert.equal(await page.locator(".archive-caption").evaluate(node=>getComputedStyle(node).borderBottomWidth),"0px");
  assert.equal(await page.locator(".archive-record-list").evaluate(node=>getComputedStyle(node).animationName),"daytrace-region-in");
  assert.equal(await page.locator("form[aria-label='筛选公开记录'] fieldset").count(),0);
  await page.getByRole("button",{name:"标签",exact:true}).click();
  const tags=page.locator("form[aria-label='筛选公开记录'] fieldset");assert.equal(await tags.evaluate(node=>getComputedStyle(node).animationName),"daytrace-region-in-left");
  const checkbox=page.getByRole("checkbox").first();await checkbox.waitFor();assert.equal(await checkbox.getAttribute("aria-checked"),"false");
  await checkbox.focus();await page.keyboard.press("Space");assert.equal(await checkbox.getAttribute("aria-checked"),"true");
  await page.getByRole("button",{name:/标签 · 已选 1/}).click();assert.equal(await page.getByRole("checkbox").count(),0);
  await category.focus();await page.keyboard.press("Enter");await page.getByRole("listbox").waitFor();await page.waitForFunction(()=>document.activeElement?.getAttribute("role")==="option");await page.keyboard.press("ArrowDown");
  await page.waitForFunction(()=>document.querySelector("[data-highlighted]")?.textContent==="技术实践");await page.keyboard.press("Enter");
  await page.getByRole("listbox").waitFor({state:"hidden"});await page.waitForFunction(()=>document.querySelector("[role='combobox']")?.textContent?.includes("技术实践"));assert.match(await category.textContent(),/技术实践/);
  await go("/search");const input=page.getByRole("searchbox");await input.focus();
  const focus=await input.evaluate(node=>{const style=getComputedStyle(node);return{outline:style.outlineStyle,width:style.outlineWidth,appearance:style.appearance};});
  assert.equal(focus.outline,"solid");assert.equal(focus.width,"2px");assert.equal(focus.appearance,"none");
 });
 await check("grouped page entrance stays short and respects reduced motion",async()=>{
  await go("/archive");const title=page.locator(".dt-scene-title");const actions=page.locator(".dt-scene-actions").first();
  assert.equal(await title.evaluate(node=>getComputedStyle(node).animationName),"dt-scene-enter");assert.equal(await title.evaluate(node=>getComputedStyle(node).animationDuration),"0.26s");
  assert.equal(await actions.evaluate(node=>getComputedStyle(node).animationName),"dt-scene-enter");assert.equal(await actions.evaluate(node=>getComputedStyle(node).animationDelay),"0.045s");
  await page.emulateMedia({reducedMotion:"reduce"});assert.equal(await title.evaluate(node=>getComputedStyle(node).animationName),"none");assert.equal(await title.evaluate(node=>getComputedStyle(node).opacity),"1");await page.emulateMedia({reducedMotion:"no-preference"});
 });
 await check("Select uses bounded enter and exit motion with a static reduced-motion fallback",async()=>{
  await go("/archive");const category=page.getByRole("combobox",{name:"记录类别"});await category.click();
  const listbox=page.getByRole("listbox");await listbox.waitFor();
  const entering=await listbox.evaluate(node=>({name:getComputedStyle(node).animationName,duration:getComputedStyle(node).animationDuration}));
  assert.equal(entering.name,"daytrace-select-in");assert.equal(entering.duration,"0.2s");
  await page.waitForTimeout(220);await page.screenshot({path:`${evidence}/select-open-desktop.png`});
  await page.keyboard.press("Escape");const closing=page.locator("[data-state='closed'][role='listbox']");await closing.waitFor({state:"attached"});
  assert.equal(await closing.evaluate(node=>getComputedStyle(node).animationName),"daytrace-select-out");await closing.waitFor({state:"detached"});
  await page.emulateMedia({reducedMotion:"reduce"});await category.click();await listbox.waitFor();
  assert.equal(await listbox.evaluate(node=>getComputedStyle(node).animationName),"none");await page.keyboard.press("Escape");await page.emulateMedia({reducedMotion:"no-preference"});
 });
 await check("mobile dialog supports interruptible native transitions without focus or scroll residue",async()=>{
  await page.setViewportSize({width:390,height:844});await go("/");const trigger=page.getByRole("button",{name:"打开导航"});await trigger.click();
  const dialog=page.getByRole("dialog");await dialog.waitFor();const transition=await dialog.evaluate(node=>getComputedStyle(node).transitionProperty);
  assert.ok(transition.includes("overlay"));assert.ok(transition.includes("transform"));
  await page.keyboard.press("Escape");await trigger.click();await dialog.waitFor();assert.equal(await page.getByRole("dialog").count(),1);
  await page.keyboard.press("Escape");await dialog.waitFor({state:"hidden"});assert.notEqual(await page.evaluate(()=>document.body.style.overflow),"hidden");
  assert.equal(await trigger.evaluate(node=>node===document.activeElement),true);
  await page.emulateMedia({reducedMotion:"reduce"});await trigger.click();assert.equal(await dialog.evaluate(node=>getComputedStyle(node).transitionDuration),"0s");await page.keyboard.press("Escape");await page.emulateMedia({reducedMotion:"no-preference"});
 });
 await check("lightbox uses composited dialog motion and immediate reduced-motion feedback",async()=>{
  await go(recipe);const image=page.locator("main img").first();await image.scrollIntoViewIfNeeded();await image.click();const dialog=page.getByRole("dialog");await dialog.waitFor();
  assert.ok((await dialog.evaluate(node=>getComputedStyle(node).transitionProperty)).includes("overlay"));
  await page.keyboard.press("Escape");await dialog.waitFor({state:"hidden"});await image.click();await dialog.waitFor();assert.equal(await page.getByRole("dialog").count(),1);await page.keyboard.press("Escape");
  await page.emulateMedia({reducedMotion:"reduce"});await image.click();await dialog.waitFor();assert.equal(await dialog.evaluate(node=>getComputedStyle(node).transitionDuration),"0s");await page.keyboard.press("Escape");await page.emulateMedia({reducedMotion:"no-preference"});
  await page.setViewportSize({width:1440,height:1000});
 });
 await check("archive detail and browser back restore filtering",async()=>{
  await go("/archive?type=recipe");await waitForText("一锅菌菇饭");
  await page.getByRole("link",{name:"麻婆豆腐：把这次的火候留下来"}).click();await page.waitForURL(/records/);
  await page.goBack();await page.waitForURL(/archive/);assert.match(await page.getByRole("combobox",{name:"记录类别"}).textContent(),/生活经验/);
  await waitForText("一锅菌菇饭");
 });
 await check("real search, empty result, failure distinction and clear",async()=>{
  await go("/search");const input=page.getByRole("searchbox");await input.fill("豆腐");await page.getByRole("button",{name:"搜索",exact:true}).click();
  await page.getByRole("link",{name:/麻婆豆腐/}).first().waitFor();assert.ok(await page.locator("mark").count()>0);
  await input.fill("这是一段肯定没有的关键词");await page.getByRole("button",{name:"搜索",exact:true}).click();await waitForText("没有找到与");
  await page.route("**/api/v1/search?**",route=>route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({schemaVersion:"1.0",error:{code:"SEARCH_UNAVAILABLE",message:"test unavailable",requestId:"synthetic-browser-failure",details:[]}})}));
  await input.fill("微前端");await page.getByRole("button",{name:"搜索",exact:true}).click();await waitForText("无法完成这次检索");
  await page.unroute("**/api/v1/search?**");await page.getByRole("button",{name:"重试搜索"}).click();await page.getByRole("link",{name:/微前端接入/}).first().waitFor();
  await input.press("Escape");assert.equal(await input.inputValue(),"");await waitForText("输入关键词开始查找");
 });
 await check("search suggestion links update results on the same route",async()=>{
  await go("/search?q=豆腐");await page.getByRole("link",{name:/麻婆豆腐/}).first().waitFor();
  await page.getByRole("link",{name:"微前端 ↗",exact:true}).click();await page.getByRole("link",{name:/微前端接入/}).first().waitFor();
  assert.equal(await page.getByRole("searchbox").inputValue(),"微前端");
 });
 await check("reader desktop layout, code copy and directory anchors",async()=>{
  await page.setViewportSize({width:1440,height:1000});await go(tech);const bodyText=page.getByText("这是一份演示复盘。",{exact:false}).first();const bodyBox=await bodyText.boundingBox();assert.ok(bodyBox!==null&&bodyBox.width>500,`desktop reader body width: ${bodyBox?.width??0}`);
  await page.getByRole("button",{name:"复制代码",exact:true}).first().waitFor();
  await page.getByRole("button",{name:"复制代码",exact:true}).first().click();await page.getByRole("button",{name:"已复制",exact:true}).waitFor();
  const clipboard=await page.evaluate(()=>navigator.clipboard.readText());assert.ok(clipboard.includes("registerMicroApps"));
  await page.getByRole("navigation",{name:"本文目录"}).getByRole("link",{name:"这次真正需要记住的"}).click();assert.ok(new URL(page.url()).hash.length>1);
 });
 await check("complete Markdown semantics stay readable, scroll locally and preserve mobile type",async()=>{
  await go(tech);assert.equal(await page.locator("[data-reader-code]").count(),2);await page.getByText("UNKNOWN-LANGUAGE",{exact:true}).waitFor();
  assert.ok(await page.locator("del").first().isVisible());const longPre=page.locator("[data-reader-code-scroll]").nth(1);
  assert.equal(await longPre.evaluate(node=>node.scrollWidth>node.clientWidth),true);assert.equal(await longPre.getAttribute("tabindex"),"0");
  const table=page.locator("[data-reader-table]").first();assert.equal(await table.getAttribute("role"),"region");
  await page.setViewportSize({width:390,height:844});await go(tech);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  assert.equal(await longPre.evaluate(node=>node.dataset.overflow),"true");assert.equal(await table.evaluate(node=>node.dataset.overflow),"true");
  const fontSize=await page.locator(".reader-body, [class*='body']").last().evaluate(node=>getComputedStyle(node).fontSize).catch(()=>null);
  const bodyFont=await page.getByText("这是一份演示复盘。",{exact:false}).first().evaluate(node=>getComputedStyle(node.parentElement).fontSize);assert.ok(parseFloat(bodyFont)>=17,`mobile body font: ${bodyFont}; probe: ${fontSize}`);
  await go(thought);await page.getByRole("link",{name:"阅读资料示例"}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
 });
 await check("code copy failure selects only code and missing images expose useful feedback",async()=>{
  await page.setViewportSize({width:1440,height:1000});await go(tech);
  await page.evaluate(()=>{navigator.clipboard.writeText=()=>Promise.reject(new Error("synthetic denied"));document.execCommand=()=>false;});
  const copy=page.getByRole("button",{name:"复制代码",exact:true}).first();await copy.click();await page.getByRole("button",{name:"复制失败，请手动复制",exact:true}).waitFor();
  const selection=await page.evaluate(()=>window.getSelection()?.toString()??"");assert.ok(selection.includes("registerMicroApps"));assert.ok(!selection.includes("复制代码"));
  await page.route("**/api/v1/assets/ast_11111111-1111-4111-8111-000000001002",route=>route.abort());await go(recipe);
  await page.getByText(/图片暂时无法显示/).waitFor();await page.unroute("**/api/v1/assets/ast_11111111-1111-4111-8111-000000001002");
 });
 await check("server-rendered Markdown remains complete without JavaScript",async()=>{
  const noJs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const staticPage=await noJs.newPage();await staticPage.goto(base+tech);
  await staticPage.getByText("registerMicroApps",{exact:false}).first().waitFor();assert.equal(await staticPage.locator("[data-reader-code]").count(),2);assert.equal(await staticPage.locator("[data-reader-table]").count(),1);await noJs.close();
 });
 await check("recipe image uses same-origin asset, caption, opens and closes with restored scroll",async()=>{
  await go(recipe);const image=page.locator("main img").first();await image.waitFor();assert.equal(await image.evaluate(node=>node.naturalWidth),960);
  assert.equal(await image.getAttribute("loading"),"eager");await page.getByText("本次成品：红油、嫩豆腐与葱花（演示素材）",{exact:true}).waitFor();
  await image.scrollIntoViewIfNeeded();await image.click();await page.getByRole("dialog").waitFor();await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({state:"hidden"});assert.notEqual(await page.evaluate(()=>document.body.style.overflow),"hidden");
  await page.screenshot({path:`${evidence}/recipe-desktop.png`,fullPage:true});
 });
 await check("owner login, private Markdown, logout and stale cookie rejection",async()=>{
  await go("/owner");await page.getByRole("link",{name:"进入演示主人空间"}).click();
  await page.getByRole("button",{name:"退出主人空间"}).waitFor();
  await page.getByRole("link",{name:"写给自己的阶段提醒"}).click();await waitForText(secret);
  const saved=(await context.cookies()).find(item=>item.name==="__Host-daytrace_session");assert.ok(saved?.httpOnly&&saved.secure);
  const publicSearch=await context.request.get(`${base}/api/v1/search?q=${encodeURIComponent(secret)}`);assert.equal((await publicSearch.json()).data.items.length,0);
  await page.getByRole("button",{name:"退出主人空间"}).click();await page.waitForURL(base+"/owner");await page.getByRole("link",{name:"进入演示主人空间"}).waitFor();
  const replay=await fetch(`${base}/api/v1/records?scope=owner`,{headers:{cookie:`__Host-daytrace_session=${saved.value}`}});assert.equal(replay.status,401);
  await page.goBack();await page.waitForLoadState("networkidle");assert.ok(!(await page.locator("body").textContent()).includes(secret));
 });
 await check("mobile menu traps focus, closes on Escape and restores scrolling",async()=>{
  await page.setViewportSize({width:390,height:844});await go("/");await page.getByRole("button",{name:"打开导航"}).click();
  await page.getByRole("dialog").waitFor();assert.equal(await page.evaluate(()=>document.body.style.overflow),"hidden");await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({state:"hidden"});assert.notEqual(await page.evaluate(()=>document.body.style.overflow),"hidden");assert.equal(await page.getByRole("button",{name:"打开导航"}).evaluate(node=>node===document.activeElement),true);
  await page.getByRole("button",{name:"打开导航"}).click();await page.getByRole("dialog").getByRole("link",{name:/全部归档/}).click();await page.waitForURL(/archive/);assert.notEqual(await page.evaluate(()=>document.body.style.overflow),"hidden");
 });
 await check("mobile recipe shortcuts and reduced-motion preference",async()=>{
  await page.emulateMedia({reducedMotion:"reduce"});await go(recipe);
  await page.getByRole("navigation",{name:"菜谱快速定位"}).getByRole("link",{name:"工序",exact:true}).click();assert.ok(new URL(page.url()).hash.length>1);
  await page.screenshot({path:`${evidence}/recipe-mobile.png`,fullPage:true});
  await page.emulateMedia({reducedMotion:"no-preference"});
 });
 for(const width of [320,360,390,430,768,1024,1440]){
  await page.setViewportSize({width,height:width<768?844:1000});
  for(const path of ["/","/archive","/search","/about",tech,recipe,thought,"/owner"]){
   await go(path);
   const layout=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth,overflow:Array.from(document.querySelectorAll("main *")).filter(node=>node.getBoundingClientRect().right>innerWidth+1).slice(0,5).map(node=>({tag:node.tagName,cls:node.className}))}));
   report.layouts.push({width,path,...layout,passed:layout.scroll<=width+1});
  }
 }
 for(const [name,path,width]of[["home-desktop","/",1440],["home-mobile","/",390],["archive-desktop","/archive",1440],["archive-mobile","/archive",390],["search-desktop","/search?q=豆腐",1440],["search-mobile","/search?q=豆腐",390],["engineering-desktop",tech,1440],["engineering-mobile",tech,390]]){
  await page.setViewportSize({width,height:width<768?844:1000});await go(path);await page.screenshot({path:`${evidence}/${name}.png`,fullPage:true});if(name==="home-desktop")await page.screenshot({path:`${evidence}/home-preview.png`});
 }
 await check("unknown record renders a useful 404",async()=>{assert.equal((await go("/records/rec_11111111-1111-4111-8111-999999999999")).status(),404);await waitForText("这条记录不存在");});
 const measure=await browser.newContext({viewport:{width:390,height:844}});const measurement=await measure.newPage();await measurement.goto(base+tech);await measurement.waitForLoadState("networkidle");
 const scriptUrls=await measurement.evaluate(()=>performance.getEntriesByType("resource").filter(entry=>entry.initiatorType==="script").map(entry=>entry.name));
 let gzipBytes=0;for(const url of new Set(scriptUrls)){const response=await fetch(url);gzipBytes+=gzipSync(Buffer.from(await response.arrayBuffer())).byteLength;}
 report.resources={page:tech,necessaryAndRequestedJsGzipBytes:gzipBytes,initialBudgetBytes:80*1024,budgetMet:gzipBytes<=80*1024,note:"Fresh browser script requests including any automatic route prefetch; local synthetic run, not field Core Web Vitals"};await measure.close();
 report.passed=report.checks.every(item=>item.passed)&&report.layouts.every(item=>item.passed)&&report.consoleErrors.length===0;
}finally{
 await writeFile(`${evidence}/browser-results.json`,JSON.stringify(report,null,2)+"\n");
 await browser.close();managed?.kill("SIGTERM");
}
console.log(JSON.stringify({passed:report.passed,checks:report.checks.filter(c=>c.passed).length,totalChecks:report.checks.length,layouts:report.layouts.length,layoutFailures:report.layouts.filter(c=>!c.passed),errors:report.consoleErrors,resources:report.resources},null,2));
if(!report.passed)process.exitCode=1;
