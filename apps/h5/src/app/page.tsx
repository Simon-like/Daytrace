import Link from "next/link";
import { getPublicRecords } from "@daytrace/content/public-api";
import { MobileRecordList } from "../components/record-list";

export const dynamic = "force-dynamic";
const categories = [
  ["engineering", "技术", "把问题想清楚"],
  ["recipe", "生活", "留住具体滋味"],
  ["reflection", "随想", "记下此刻理解"],
] as const;

export default async function H5Home() {
  const data = await getPublicRecords().catch(() => null);
  return <main className="h5-home">
    <section className="h5-hero dt-scene-title">
      <p className="h5-kicker">A PERSONAL FIELD JOURNAL</p>
      <h1>把日常，<br />留给未来的自己<span>。</span></h1>
      <p>技术、生活和那些不想忘记的念头，<br />按时间留在这里。</p>
      <Link className="h5-text-link" href="/archive">翻开全部归档 <span aria-hidden="true">→</span></Link>
    </section>
    <nav className="h5-category-strip dt-scene-actions" aria-label="记录类别">{categories.map(([type,label,note]) => <Link key={type} href={`/archive?type=${type}`}><span>{label}</span><small>{note}</small><i aria-hidden="true">↗</i></Link>)}</nav>
    <section className="h5-recent" aria-labelledby="h5-recent-title"><div className="h5-section-title"><h2 id="h5-recent-title">最近留下的</h2><span>{data?.items.length ?? 0} 页记录</span></div>{data ? <MobileRecordList records={data.items.slice(0, 4)} /> : <p role="alert" className="h5-error">暂时无法读取记录，请稍后重新打开。</p>}</section>
  </main>;
}
