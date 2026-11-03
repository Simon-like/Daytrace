import { notFound, redirect } from "next/navigation";
import { PublicApiError } from "@daytrace/content/public-api";
import { MobileReader } from "../../../../components/mobile-reader";
import { ownerApi } from "../../../../server/owner-api";

export const dynamic = "force-dynamic";
export const metadata = { title: "主人记录", robots: { index: false, follow: false } };

export default async function H5OwnerRecordPage({ params }: { readonly params: Promise<{ recordId: string }> }) {
  const { recordId } = await params;
  const record = await (await ownerApi()).record(recordId).catch((error: unknown) => {
    if (error instanceof PublicApiError && error.status === 401) redirect("/h5/owner");
    throw error;
  });
  if (!record) notFound();
  const mobileRecord = { ...record, body: { ...record.body,
    html: record.body.html.replace(/href="\/records\/(rec_[0-9a-f-]{36})\//g, 'href="/h5/records/$1/'),
  } };
  return <MobileReader record={mobileRecord} owner />;
}
