import Link from "next/link";
import { ownerApi } from "../../server/owner-api";
import { PublicApiError } from "../../server/api";
import { OwnerRecordList } from "../../features/owner";
import { SearchPanel } from "../../features/search";
import { OwnerSessionControls } from "../../components/owner-session";
import { Icon } from "../../components/icon";
export const dynamic = "force-dynamic";
export const metadata = { title:"只留给自己",robots:{index:false,follow:false} };
export default async function OwnerPage() {
  const result = await (await ownerApi()).list().then(data=>({data,error:null})).catch((error:unknown)=>({data:null,error}));
  const demo = process.env.DAYTRACE_DEMO === "1";
  const unavailable = result.error !== null && !(result.error instanceof PublicApiError && result.error.status === 401);
  return <main className="owner-main"><header className="page-heading owner-intro dt-scene-title"><div><p className="eyebrow">JUST FOR YOURSELF / 私人一页</p><h1>有些话，只想留给自己。</h1><p>未整理好的念头、阶段性的提醒，放在一个安静的地方。</p></div><span className="private-label"><Icon name="lock" size={14} />主人空间</span></header>{result.data ? <><div className="owner-intro"><p className="hand-note">不用写得很好。这里是给自己的。</p><Link className="primary-link" href="/owner/content">打开内容库 ↗</Link><OwnerSessionControls /></div>{demo && <p className="demo-explanation">当前使用隔离的演示身份与示例记录。</p>}<SearchPanel scope="owner" /><OwnerRecordList records={result.data.items} /></> : <section className="owner-empty"><Icon name="lock" size={31}/><h2>{unavailable?"暂时无法打开这一页":"先把门轻轻打开。"}</h2><p>{unavailable?"主人空间暂时无法读取，请稍后重试。你的记录没有被当作空集合。":"这里的内容需要主人身份才能查看。它们不会出现在公开归档或公开搜索中。"}</p>{!unavailable?<><a className="primary-link" href="/api/v1/auth/login?returnTo=/owner">{demo?"进入演示主人空间":"登录主人空间"} <Icon name="arrow" size={16}/></a>{demo&&<p className="demo-explanation">演示身份仅在本机演示模式中启用，里面都是示例资料。</p>}</>:<Link className="text-link" href="/owner">重新打开主人空间 ↗</Link>}</section>}</main>;
}
