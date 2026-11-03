import Link from "next/link";
import { RecordList } from "../features/records/record-list";
import { Icon } from "../components/icon";
import { getPublicRecords } from "../server/api";

export const dynamic = "force-dynamic";
const categories = [
  { type: "engineering", label: "技术实践" },
  { type: "recipe", label: "生活经验" },
  { type: "reflection", label: "随想认知" },
] as const;

export default async function HomePage() {
  const data = await getPublicRecords().catch(() => null);
  if (data === null) return <main className="state-page" role="alert"><p className="eyebrow">暂时不可用</p><h1>暂时无法读取公开记录。</h1><p>稍等一会儿，再回来翻翻。内容服务恢复后，这些记录仍会在这里。</p><Link prefetch={false} className="text-link" href="/">重新打开首页 ↗</Link></main>;
  const records = data.items;
  return <main className="home-main">
    <header className="home-intro">
      <div className="intro-copy dt-scene-title">
        <p className="eyebrow">A PERSONAL FIELD JOURNAL</p>
        <h1>把日常，<br />留给未来的自己<span className="title-period">。</span></h1>
        <p className="intro-description">技术、生活和那些不想忘记的念头，按时间留在这里。</p>
        <Link prefetch={false} className="inline-link" href="/archive">翻开全部归档 <Icon name="arrow" size={17} /></Link>
      </div>
      <div className="intro-margin" aria-label="站点寄语"><p>不是每一刻都要有答案，<br />但每一点理解，都有来处。</p></div>
    </header>
    <nav className="home-categories dt-scene-actions" aria-label="按类别查看归档">
      {categories.map(category => <Link prefetch={false} href={`/archive?type=${category.type}`} key={category.type}><strong>{category.label}</strong><span>{records.filter(record => record.type === category.type).length} 篇</span></Link>)}
    </nav>
    <div className="home-columns">
      <section className="recent-section" aria-labelledby="recent-records">
        <div className="section-heading"><h2 id="recent-records">最近留下的</h2><Link prefetch={false} className="subtle-link" href="/archive">全部记录 ↗</Link></div>
        <RecordList records={records.slice(0, 4)} />
      </section>
    </div>
  </main>;
}
