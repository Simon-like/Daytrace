import { MobileSearch } from "../../components/mobile-search";

export const dynamic = "force-dynamic";
export const metadata = { title: "找一找" };
export default async function H5SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return <main><header className="h5-page-heading h5-search-heading dt-scene-title"><p className="h5-kicker">FIND A THREAD</p><h1>想起一点，<br />再找到一点。</h1><p>一个概念、一种食材，或那句记不太清的话。</p></header><MobileSearch key={q ?? ""} initialQuery={typeof q === "string" ? q : ""} /></main>;
}
