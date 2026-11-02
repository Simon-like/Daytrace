import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir, writeFile, open } from "node:fs/promises";
import { spawn } from "node:child_process";
import { gzipSync } from "node:zlib";
const base=process.env.DEMO_BASE_URL??"http://127.0.0.1:3000";
const evidence="docs/project/evidence/DEMO-001";
await mkdir(evidence,{recursive:true});
let managed;
if(process.env.DEMO_MANAGED_SERVER==="1"){
  const log=await open(".local/demo-handoff/browser-server.log","w").catch(async()=>{await mkdir(".local/demo-handoff",{recursive:true});return open(".local/demo-handoff/browser-server.log","w");});
  managed=spawn(process.execPath,["scripts/demo/run-demo.mjs","--skip-build"],{stdio:["ignore",log.fd,log.fd]});
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
  await go("/");await page.getByRole("link",{name:/MAKE SOMETHING/}).click();
  await page.waitForURL(/archive\?type=recipe/);await page.getByRole("combobox").waitFor();
  await page.waitForFunction(()=>document.querySelector('select')?.value==='recipe');
  await waitForText("一锅菌菇饭");
  await page.getByRole("combobox").selectOption("engineering");await page.getByRole("button",{name:"应用筛选"}).click();
  await waitForText("看陌生代码时");assert.ok(!await page.locator("main").textContent().then(s=>s.includes("一锅菌菇饭")));
  await page.getByRole("button",{name:"清除筛选"}).click();await waitForText("一锅菌菇饭");
 });
 await check("archive detail and browser back restore filtering",async()=>{
  await go("/archive?type=recipe");await waitForText("一锅菌菇饭");
  await page.getByRole("link",{name:"麻婆豆腐：把这次的火候留下来"}).click();await page.waitForURL(/records/);
  await page.goBack();await page.waitForURL(/archive/);await page.waitForFunction(()=>document.querySelector('select')?.value==='recipe');
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
 await check("reader code copies the actual code and directory anchors focus content",async()=>{
  await go(tech);await page.getByRole("button",{name:"复制代码",exact:true}).waitFor();
  await page.getByRole("button",{name:"复制代码",exact:true}).click();await page.getByRole("button",{name:"已复制",exact:true}).waitFor();
  const clipboard=await page.evaluate(()=>navigator.clipboard.readText());assert.ok(clipboard.includes("registerMicroApps"));
  await page.getByRole("navigation",{name:"本文目录"}).getByRole("link",{name:"这次真正需要记住的"}).click();assert.ok(new URL(page.url()).hash.length>1);
 });
 await check("recipe image uses same-origin asset, opens and closes with restored scroll",async()=>{
  await go(recipe);const image=page.locator("main img").first();await image.waitFor();assert.equal(await image.evaluate(node=>node.naturalWidth),960);
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
 for(const [name,path,width]of[["home-desktop","/",1440],["home-mobile","/",390],["archive-mobile","/archive",390],["search-desktop","/search?q=豆腐",1440],["engineering-mobile",tech,390]]){
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
