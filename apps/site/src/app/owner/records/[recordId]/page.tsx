import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ownerApi } from "../../../../server/owner-api";
import { PublicApiError } from "../../../../server/api";
import { ReaderArticle } from "../../../../features/reader";
import { OwnerSessionControls } from "../../../../components/owner-session";
import { ReadingFontSizeControl } from "@daytrace/ui/reading-font-size-control";
export const dynamic = "force-dynamic";
export const metadata = {title:"主人记录",robots:{index:false,follow:false}};
export default async function OwnerRecordPage({params}:{params:Promise<{recordId:string}>}) {
  const {recordId} = await params;
  const record = await (await ownerApi()).record(recordId).catch((error:unknown)=> {
    if(error instanceof PublicApiError&&error.status===401) redirect("/owner");
    throw error;
  });
  if(!record) notFound();
  return <main className="reader-main"><div className="reader-topline"><Link href="/owner">← 返回主人空间</Link><div className="reader-tools"><ReadingFontSizeControl /><OwnerSessionControls /></div></div><div className="private-banner">仅在主人空间中可见{process.env.DAYTRACE_DEMO === "1" ? " · 当前为示例资料" : ""}</div><ReaderArticle record={record} owner marginNote="有些话，留在这里就很好。" /></main>;
}
