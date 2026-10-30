"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="state-page" role="alert">
      <p className="eyebrow">暂时不可用</p>
      <h1>暂时无法读取公开记录。</h1>
      <p>内容读取失败不会显示为空列表。请稍后重试；私密记录信息不会出现在这里。</p>
      <button type="button" onClick={reset}>重新读取</button>
    </main>
  );
}
