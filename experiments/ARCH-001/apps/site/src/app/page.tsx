import Link from "next/link";

export default function Home() {
  return (
    <main>
      <p>ARCH-001 合成验证</p>
      <h1>Markdown → Nest API → Next SSR</h1>
      <Link href="/records/public-arch-sample">打开公开合成文章</Link>
    </main>
  );
}
