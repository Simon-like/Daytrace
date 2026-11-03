import { getPublicRecords } from "@daytrace/content/public-api";
import { MobileArchive } from "../../components/mobile-archive";

export const dynamic = "force-dynamic";
export const metadata = { title: "全部归档" };

export default async function H5ArchivePage() {
  const data = await getPublicRecords().catch(() => null);
  return <main><header className="h5-page-heading h5-archive-heading dt-scene-title"><p className="h5-kicker">THE ARCHIVE</p><h1>每一页，<br />都有来处。</h1><p>按类别或标签，重新遇见当时的理解。</p></header>{data ? <MobileArchive initialRecords={data} availableTags={Array.from(new Set(data.items.flatMap(record => record.tags)))} /> : <p className="h5-error" role="alert">暂时无法读取归档，请稍后重新打开。</p>}</main>;
}
