import Link from "next/link";
import { SearchPanel } from "../../features/search";
export const dynamic = "force-dynamic";
export const metadata = { title: "找一找" };
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return <main className="search-main"><header className="page-heading"><p className="eyebrow">FIND A THREAD / 循迹而来</p><h1>想起一点，再找到一点。</h1><p>一个概念、一种食材，或是那句记不太清的话。</p></header><SearchPanel key={q ?? ""} initialQuery={typeof q === "string" ? q : ""} /><div className="search-suggestions"><span>不妨从这里开始</span>{["微前端","豆腐","记录"].map(word=><Link key={word} href={`/search?q=${encodeURIComponent(word)}`}>{word} ↗</Link>)}</div></main>;
}
