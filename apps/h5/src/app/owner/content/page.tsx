import Link from "next/link";
import { redirect } from "next/navigation";
import { PublicApiError } from "@daytrace/content/public-api";
import { ContentManager } from "@daytrace/content/management";
import { ownerApi } from "../../../server/owner-api";

export const dynamic = "force-dynamic";
export const metadata = { title: "内容库", robots: { index: false, follow: false } };

export default async function H5ContentPage() {
  const error = await (await ownerApi()).list().then(() => null).catch((cause: unknown) => cause);
  if (error instanceof PublicApiError && error.status === 401) redirect("/owner");
  if (error !== null) return <main><p className="h5-error" role="alert">暂时无法打开内容库，请稍后重试。</p><Link href="/owner" className="h5-text-link">返回主人空间 →</Link></main>;
  return <main><Link href="/owner" className="h5-text-link">← 主人空间</Link><header className="h5-page-heading"><p className="h5-kicker">KEEP YOUR WORDS</p><h1>写好的，<br />慢慢收好。</h1><p>上传、预览、整理，也可以随时带走。</p>{process.env.DAYTRACE_DEMO === "1" ? <p>本地演示身份，请使用合成资料体验。</p> : null}</header><ContentManager ownerPath="/h5/owner" /></main>;
}
