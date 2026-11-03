import Link from "next/link";
import { PublicApiError } from "@daytrace/content/public-api";
import { Icon } from "@daytrace/ui/icon";
import { MobileRecordList } from "../../components/record-list";
import { OwnerSearch } from "../../features/owner/owner-search";
import { OwnerSessionControls } from "../../features/owner/owner-session";
import { ownerApi } from "../../server/owner-api";

export const dynamic = "force-dynamic";
export const metadata = { title: "主人空间", robots: { index: false, follow: false } };

export default async function H5OwnerPage({ searchParams }: { readonly searchParams: Promise<{ q?: string }> }) {
  const result = await (await ownerApi()).list().then(data => ({ data, error: null })).catch((error: unknown) => ({ data: null, error }));
  const { q } = await searchParams;
  const demo = process.env.DAYTRACE_DEMO === "1";
  const unavailable = result.error !== null && !(result.error instanceof PublicApiError && result.error.status === 401);
  return <main>
    <header className="h5-page-heading h5-owner-heading dt-scene-title"><p className="h5-kicker">JUST FOR YOURSELF</p><h1>有些话，<br />只想留给自己。</h1><p>未整理好的念头、阶段性的提醒，都放在这个安静的地方。</p></header>
    {result.data ? <>
      <div className="h5-owner-toolbar"><span><Icon name="lock" size={15} />主人空间</span><OwnerSessionControls /></div>
      {demo ? <p className="h5-owner-note">当前使用隔离的演示身份与示例记录。</p> : null}
      <OwnerSearch key={typeof q === "string" ? q : ""} initialQuery={typeof q === "string" ? q : ""} />
      <section className="h5-owner-records" aria-label="全部主人记录"><div className="h5-section-title"><h2>全部记录</h2><span>{result.data.items.length} 篇</span></div><MobileRecordList records={result.data.items} hrefPrefix="/owner/records" showState /></section>
    </> : <section className="h5-empty h5-owner-empty"><Icon name="lock" size={31} /><h2>{unavailable ? "暂时无法打开这一页" : "先把门轻轻打开。"}</h2><p>{unavailable ? "主人空间暂时无法读取，请稍后重试。你的记录没有被当作空集合。" : "这里的内容需要主人身份才能查看，不会出现在公开归档或公开搜索中。"}</p>{unavailable ? <Link className="h5-text-link" href="/owner">重新打开主人空间 ↗</Link> : <><a className="h5-owner-login" href="/api/v1/auth/login?returnTo=/h5/owner">{demo ? "进入演示主人空间" : "登录主人空间"} ↗</a>{demo ? <small>演示身份仅在本机演示模式中启用，里面都是示例资料。</small> : null}</>}</section>}
  </main>;
}
