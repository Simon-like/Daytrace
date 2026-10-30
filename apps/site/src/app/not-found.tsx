import Link from "next/link";

export default function NotFound() {
  return (
    <main className="state-page">
      <p className="eyebrow">404 / 没有找到</p>
      <h1>这条记录不存在，或当前不可见。</h1>
      <p>页面不会区分私密记录与不存在的记录，也不会显示它们的标题或摘要。</p>
      <Link className="text-link" href="/">返回近期记录</Link>
    </main>
  );
}
