import Link from "next/link";
import { redirect } from "next/navigation";
import { ownerApi } from "../../../server/owner-api";
import { PublicApiError } from "../../../server/api";
import { ContentManager } from "../../../features/content-management/content-manager";
export const dynamic = "force-dynamic";
export const metadata = { title: "内容库", robots: { index: false, follow: false } };
export default async function ContentPage() {
  await (await ownerApi()).list().catch((error: unknown) => {
    if (error instanceof PublicApiError && error.status === 401) redirect("/owner");
    throw error;
  });
  return <main className="owner-main"><div className="reader-topline"><Link href="/owner">← 主人空间</Link><span>仅主人可见</span></div><header className="page-heading dt-scene-title"><p className="eyebrow">KEEP YOUR WORDS / 内容库</p><h1>写好的，慢慢收好。</h1><p>上传、预览、整理，也可以随时带走。每一页都保留自己的来处。</p>{process.env.DAYTRACE_DEMO === "1" && <p className="demo-explanation">本地演示身份，请使用合成资料体验。</p>}</header><ContentManager /></main>;
}
