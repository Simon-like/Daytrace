import { getPublicRecords, getPublicTags } from "../../server/api";
import { RecordsDiscovery } from "../../features/records";
export const dynamic = "force-dynamic";
export const metadata = { title: "全部归档" };
export default async function ArchivePage({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const filters = await searchParams;
  const [data, tags] = await Promise.all([getPublicRecords(undefined, 50).catch(() => null), getPublicTags().catch(() => null)]);
  return <main className="archive-main"><header className="page-heading dt-scene-title"><p className="eyebrow">THE ARCHIVE / 日常有迹</p><h1>每一页，都有来处。</h1><p>按类别翻找，或循着一个标签，重新遇见当时的理解。</p><span className="hand-note">总有一页，刚好是此刻想看的。</span></header>{data ? <><div className="archive-caption"><span>公开档案</span><span>按发生时间排列</span></div><RecordsDiscovery key={JSON.stringify(filters)} initialRecords={data} tagsComplete={tags !== null} availableTags={tags ?? Array.from(new Set(data.items.flatMap(r => r.tags)))} /></> : <div role="alert" className="empty-state">暂时无法读取归档，请稍后刷新重试。</div>}</main>;
}
