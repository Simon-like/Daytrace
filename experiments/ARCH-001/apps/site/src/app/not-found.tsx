import Link from "next/link";

export default function NotFound() {
  return (
    <main>
      <h1>记录不可用</h1>
      <p>没有找到可公开访问的记录。</p>
      <Link href="/">返回首页</Link>
    </main>
  );
}
