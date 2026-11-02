import assert from "node:assert/strict";
import { resolve,join } from "node:path";
import { cp,mkdtemp,rm,readFile,writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { after, before, test } from "node:test";
import type { INestApplication } from "@nestjs/common";
import { createApiApplication } from "../../../apps/api/src/bootstrap";
const root=resolve("apps/api/fixtures/demo");
const privateId="rec_11111111-1111-4111-8111-000000000091";
const asset="ast_11111111-1111-4111-8111-000000009101";
const publicOrigin="http://127.0.0.1:3000";
let app:INestApplication;let origin:string;
before(async()=>{app=await createApiApplication(root,false,publicOrigin);await app.listen(0,"127.0.0.1");const address=app.getHttpServer().address();origin=`http://127.0.0.1:${address.port}`;});
after(async()=>{await app?.close();});
async function login(){
  const first=await fetch(`${origin}/api/v1/auth/login`,{redirect:"manual"});assert.equal(first.status,302);
  const transaction=first.headers.getSetCookie()[0]!.split(";")[0]!;
  const callback=new URL(first.headers.get("location")!);
  const response=await fetch(`${origin}${callback.pathname}${callback.search}`,{redirect:"manual",headers:{cookie:transaction}});
  assert.equal(response.status,302);
  return response.headers.getSetCookie().find(value=>value.startsWith("__Host-daytrace_session=")&&!value.includes("Max-Age=0"))!.split(";")[0]!;
}
test("demo loads all three types from actual Markdown without exposing private or draft content",async()=>{
  const response=await fetch(`${origin}/api/v1/records`);assert.equal(response.status,200);
  const text=await response.text();const data=JSON.parse(text).data;
  assert.equal(data.items.length,8);assert.deepEqual(new Set(data.items.map((r:{type:string})=>r.type)),new Set(["engineering","recipe","reflection"]));
  assert.ok(!text.includes("写给自己的阶段提醒"));assert.ok(!text.includes("DEMO_PRIVATE"));
  for(const path of [`records/${privateId}`,`assets/${asset}`]){
    const result=await fetch(`${origin}/api/v1/${path}`);assert.equal(result.status,404);assert.ok(!(await result.text()).includes("DEMO_PRIVATE"));
  }
  assert.equal((await fetch(`${origin}/api/v1/records?scope=owner`)).status,401);
});
test("search is registered and keeps the public projection even with an owner session",async()=>{
  const cookie=await login();
  const found=await fetch(`${origin}/api/v1/search?q=${encodeURIComponent("豆腐")}`);assert.equal(found.status,200);assert.ok((await found.text()).includes("麻婆豆腐"));
  const response=await fetch(`${origin}/api/v1/search?q=${encodeURIComponent("把没想清楚的部分，也安心留在这里。") }`,{headers:{cookie}});
  assert.equal(response.status,200);assert.equal((await response.json()).data.items.length,0);
});
test("owner content and private files require a real server session and logout revokes it",async()=>{
  const cookie=await login();
  const detail=await fetch(`${origin}/api/v1/records/${privateId}?scope=owner`,{headers:{cookie}});
  assert.equal(detail.status,200);assert.match(detail.headers.get("cache-control")??"",/no-store/);assert.ok((await detail.text()).includes("把没想清楚的部分，也安心留在这里。"));
  const file=await fetch(`${origin}/api/v1/assets/${asset}`,{headers:{cookie}});assert.equal(file.status,200);assert.ok((await file.text()).includes("DEMO_PRIVATE_ATTACHMENT_C73A"));
  const csrf=await (await fetch(`${origin}/api/v1/auth/csrf`,{headers:{cookie}})).json();
  const denied=await fetch(`${origin}/api/v1/auth/logout`,{method:"POST",headers:{cookie,origin:"http://evil.invalid","x-csrf-token":csrf.csrfToken}});assert.equal(denied.status,403);
  const logout=await fetch(`${origin}/api/v1/auth/logout`,{method:"POST",headers:{cookie,origin:publicOrigin,"x-csrf-token":csrf.csrfToken}});assert.equal(logout.status,204);
  assert.equal((await fetch(`${origin}/api/v1/records?scope=owner`,{headers:{cookie}})).status,401);
  assert.equal((await fetch(`${origin}/api/v1/assets/${asset}`,{headers:{cookie}})).status,404);
});
test("demo authentication rejects non-loopback origins and production",async()=>{
  await assert.rejects(createApiApplication(root,false,"https://example.com"),/loopback/);
  const previous=process.env.NODE_ENV;process.env.NODE_ENV="production";
  try{await assert.rejects(createApiApplication(root,false,publicOrigin),/loopback/);}finally{if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous;}
});

test("private validation failures do not publish private file paths", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "daytrace-private-error-"));
  let failed: INestApplication | undefined;
  try {
    await cp(root, temporary, { recursive: true });
    const file = join(temporary, "private/owner-reminder/index.md");
    await writeFile(file, `${await readFile(file, "utf8")}\n<script>private</script>\n`);
    failed = await createApiApplication(temporary);
    await failed.listen(0,"127.0.0.1");
    const port = failed.getHttpServer().address().port;
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/records`);
    assert.equal(response.status,503);
    const body = await response.text();
    assert.ok(!body.includes("private/owner-reminder"));
    assert.ok(!body.includes("写给自己的阶段提醒"));
  } finally { await failed?.close(); await rm(temporary,{recursive:true,force:true}); }
});
