import { spawn, spawnSync } from "node:child_process";
import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const major=Number(process.versions.node.split(".")[0]);
if(major<24){console.error("请先使用项目指定的 Node.js：nvm use，再运行 pnpm demo。");process.exit(1);}
function argument(name,fallback){const index=process.argv.indexOf(name);return index<0?fallback:process.argv[index+1];}
const port=Number(argument("--port","3000"));const apiPort=Number(argument("--api-port","3001"));
if(![port,apiPort].every(value=>Number.isInteger(value)&&value>0&&value<65536)||port===apiPort)throw new Error("两个服务需要不同的有效端口");
const origin=`http://127.0.0.1:${port}`;
const children=[];let stopping=false;
function stop(code=0){if(stopping)return;stopping=true;for(const child of children){if(child.exitCode!==null)continue;try{process.kill(-child.pid,"SIGTERM");}catch{child.kill("SIGTERM");}}setTimeout(()=>process.exit(code),600).unref();}
process.on("SIGINT",()=>stop());process.on("SIGTERM",()=>stop());
function launch(file,args,env){const child=spawn(process.execPath,[file,...args],{cwd:root,env:{...process.env,...env},stdio:"inherit",detached:process.platform!=="win32"});children.push(child);child.on("error",error=>{console.error(error.message);stop(1);});child.on("exit",code=>{if(!stopping)stop(code??1);});return child;}
async function ready(url){for(let n=0;n<100;n++){if(stopping)throw new Error("演示服务已停止");try{const response=await fetch(url,{signal:AbortSignal.timeout(1000)});if(response.ok)return;}catch{}await new Promise(resolve=>setTimeout(resolve,300));}throw new Error(`无法启动：${url}`);}
try{
  if(!process.argv.includes("--skip-build")){const built=spawnSync("pnpm",["build"],{cwd:root,env:{...process.env,NEXT_TELEMETRY_DISABLED:"1"},stdio:"inherit"});if(built.status!==0)process.exit(built.status??1);}
  await access(resolve(root,"apps/site/.next/BUILD_ID"));
  const prepared=spawnSync(process.execPath,["scripts/ci/prepare-standalone.mjs"],{cwd:root,stdio:"inherit"});
  if(prepared.status!==0)throw new Error("无法准备站点运行文件");
  launch(resolve(root,"apps/api/dist/main.js"),[],{NODE_ENV:"test",DAYTRACE_DEMO:"1",PUBLIC_ORIGIN:origin,API_HOST:"127.0.0.1",API_PORT:String(apiPort),CONTENT_ROOT:resolve(root,"apps/api/fixtures/demo")});
  await ready(`http://127.0.0.1:${apiPort}/api/v1/health/ready`);
  launch(resolve(root,"apps/site/.next/standalone/apps/site/server.js"),[],{HOSTNAME:"127.0.0.1",PORT:String(port),NODE_ENV:"production",DAYTRACE_DEMO:"1",PUBLIC_ORIGIN:origin,API_INTERNAL_ORIGIN:`http://127.0.0.1:${apiPort}`,NEXT_TELEMETRY_DISABLED:"1"});
  await ready(origin);
  console.log(`\n有迹 Daytrace Demo 已就绪：${origin}\n所有记录与主人身份均为隔离示例。按 Ctrl+C 同时停止两个服务。\n`);
}catch(error){console.error(error.message);stop(1);}
