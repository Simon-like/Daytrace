import Link from "next/link";

export default function NotFound() {
  return (
    <main className="state-page">
      <p className="eyebrow">404 / 没有找到</p>
      <h1>这条记录不存在，或当前不可见。</h1>
      <p>链接可能已经改变，或这页暂时不对外开放。回到归档，找找别的线索吧。</p>
      <Link className="text-link" href="/">返回近期记录</Link>
    </main>
  );
}
