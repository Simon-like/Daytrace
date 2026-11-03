import Link from "next/link";
export default function H5NotFound() {
  return <main className="h5-not-found"><p className="h5-kicker">PAGE NOT FOUND</p><h1>这一页暂时找不到了。</h1><p>链接可能已经变化，也可能这条记录从未公开。</p><Link className="h5-text-link" href="/archive">回到全部归档 →</Link></main>;
}
