import Link from "next/link";
import { RecordList } from "../features/records/record-list";
import { Icon } from "../components/icon";
import { getPublicRecords } from "../server/api";

export const dynamic = "force-dynamic";
const drawers = [
  { type: "engineering", label: "技术实践", en: "MAKE SENSE OF IT", description: "把问题拆开，把理解留下。", icon: "code" },
  { type: "recipe", label: "生活经验", en: "MAKE SOMETHING", description: "一餐一饭，也是值得记住的事。", icon: "bowl" },
  { type: "reflection", label: "随想认知", en: "MAKE ROOM TO THINK", description: "此刻的想法，留给后来的自己。", icon: "feather" },
] as const;
export default async function HomePage() {
  const data = await getPublicRecords().catch(() => null);
  if (data === null) return <main className="state-page" role="alert"><p className="eyebrow">暂时不可用</p><h1>暂时无法读取公开记录。</h1><p>稍等一会儿，再回来翻翻。内容服务恢复后，这些记录仍会在这里。</p><Link prefetch={false} className="text-link" href="/">重新打开首页 ↗</Link></main>;
  const records = data.items;
  const recipe = records.find(r => r.type === "recipe");
  const reflection = records.find(r => r.type === "reflection");
  return <main className="home-main">
    <div className="page-topline"><span>个人知识与生活档案</span><span><i className="status-dot" /> 持续生长中</span></div>
    <header className="home-intro"><div className="intro-copy"><p className="eyebrow">A PERSONAL FIELD JOURNAL</p><h1>把日常，<br />留给未来的自己<span className="title-period">。</span></h1><p className="intro-description">技术里的新理解，厨房里的小经验，<br className="desktop-break" />还有那些不想忘记的念头。都在这里，慢慢留下来。</p><Link prefetch={false} className="inline-link" href="/archive">翻开我的归档 <Icon name="arrow" size={17} /></Link><p className="mobile-hand-note">先留下一点，再慢慢长大。</p></div><div className="intro-margin" aria-label="站点寄语"><span className="margin-cross">✳</span><p>不是每一刻都要有答案，<br />但每一点理解，都有来处。</p><svg width="138" height="35" viewBox="0 0 138 35" fill="none" aria-hidden="true"><path d="M3 14c35 8 75-7 125-1M118 3l13 9-14 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg><small>给后来的一笔</small></div></header>
    <section className="drawer-grid" aria-label="记录分类">{drawers.map(drawer => <Link prefetch={false} className={`drawer-card drawer-${drawer.type}`} href={`/archive?type=${drawer.type}`} key={drawer.type}><div className="drawer-top"><Icon name={drawer.icon} size={24} /><span>{String(records.filter(r => r.type === drawer.type).length).padStart(2,"0")} 篇</span></div><span className="drawer-en">{drawer.en}</span><h2>{drawer.label}<span>↗</span></h2><p>{drawer.description}</p></Link>)}</section>
    <div className="home-columns"><section className="recent-section" aria-labelledby="recent-records"><div className="section-heading"><div><p className="eyebrow">RECENT ENTRIES</p><h2 id="recent-records">最近留下的</h2></div><Link prefetch={false} className="subtle-link" href="/archive">全部记录 ↗</Link></div><RecordList records={records.slice(0,5)} /><Link prefetch={false} className="archive-end" href="/archive">再往前翻翻 <Icon name="arrow" size={17} /></Link></section><aside className="home-margin"><section className="margin-kitchen"><p className="eyebrow">FROM THE KITCHEN / 厨房一页</p>{recipe && <><Link prefetch={false} href={`/records/${recipe.id}`} className="kitchen-photo"><img src="/demo/mapo.webp" width="640" height="426" alt="麻婆豆腐演示照片，项目生成素材" loading="lazy" /><span>周末，慢慢做顿饭。</span></Link><p className="photo-note">照片为项目生成素材</p><h3><Link prefetch={false} href={`/records/${recipe.id}`}>{recipe.title}</Link></h3><p>{recipe.summary}</p><Link prefetch={false} className="inline-link" href={`/records/${recipe.id}`}>看看这道菜 <Icon name="arrow" size={16} /></Link></>}</section><section className="margin-thought"><p className="eyebrow">A THOUGHT TO KEEP</p><span className="quote-glyph">“</span><p className="thought-excerpt">{reflection?.summary ?? "先留下一句，也算一次记录。"}</p>{reflection && <Link prefetch={false} className="subtle-link" href={`/records/${reflection.id}`}>翻到这页 ↗</Link>}<p className="hand-note">有些话，值得再看一遍。</p></section><div className="margin-label"><Icon name="sun" size={18} /><p>不赶进度，只留痕迹。<br /><span>这是有迹的示例庭院。</span></p></div></aside></div>
  </main>;
}
