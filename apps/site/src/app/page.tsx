import { RecordList } from "../features/records/record-list";
import { getPublicRecords } from "../server/api";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const records = await getPublicRecords().catch(() => null);
  if (records === null) {
    return (
      <main className="state-page" role="alert">
        <p className="eyebrow">暂时不可用</p>
        <h1>暂时无法读取公开记录。</h1>
        <p>内容读取失败不会显示为空列表。请稍后重试；私密记录信息不会出现在这里。</p>
      </main>
    );
  }
  return (
    <main className="home-main">
      <header className="home-intro">
        <p className="eyebrow">FIELD NOTES / 近期归档</p>
        <h1>把做过的事，<br />留成以后能找到的路。</h1>
        <p>这里是有迹的公开记录。当前页面使用合成内容验证正式工程链路，不代表用户真实经历。</p>
        <p className="hand-note">公开合成样本 · 运行时 SSR</p>
      </header>
      <section aria-labelledby="recent-records">
        <div className="section-heading">
          <h2 id="recent-records">近期记录</h2>
          <span>{records.items.length} 篇公开记录</span>
        </div>
        <RecordList records={records.items} />
      </section>
    </main>
  );
}
