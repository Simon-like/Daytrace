import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { isRecordId } from "@daytrace/contracts";
import { getPublicRecord } from "../../../server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "有迹 Daytrace 公开记录分享卡";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const fontData = readFile(path.join(process.cwd(), "assets", "fonts", "NotoSansSC-Regular.ttf"));
const typeLabels = { engineering: "技术实践", recipe: "生活经验", reflection: "随想认知" } as const;

interface ShareImageProps {
  readonly params: Promise<{ recordRef: string }>;
}

export default async function OpengraphImage({ params }: ShareImageProps): Promise<ImageResponse> {
  const { recordRef } = await params;
  const record = isRecordId(recordRef) ? await getPublicRecord(recordRef) : null;
  const title = record?.title ?? "让经历，有迹可循。";
  const eyebrow = record === null ? "私人档案 · 公开分享" : `${typeLabels[record.type]} · ${record.occurredOn ?? record.updatedAt.slice(0, 10)}`;
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", background: "#f2eee3", color: "#243128", fontFamily: "Noto Sans SC", padding: "54px 64px", position: "relative" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "18px", background: "#314b3a", display: "flex" }} />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", border: "1px solid #c6c6b7", padding: "42px 48px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 24, letterSpacing: 2 }}>
          <div style={{ display: "flex", fontWeight: 600 }}>有迹 · DAYTRACE</div>
          <div style={{ display: "flex", color: "#697466", fontSize: 20 }}>留下过程，也留下线索</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: "28px" }}>
          <div style={{ display: "flex", color: "#8b5e3c", fontSize: 24, marginBottom: "24px" }}>{eyebrow}</div>
          <div style={{ display: "flex", fontSize: record === null ? 72 : 60, fontWeight: 600, lineHeight: 1.28, letterSpacing: -1, maxWidth: "960px" }}>{title}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#697466", fontSize: 21 }}>
          <div style={{ display: "flex" }}>技术实践 · 生活经验 · 随想认知</div>
          <div style={{ display: "flex", color: "#314b3a" }}>daytrace / records</div>
        </div>
      </div>
    </div>,
    { ...size, fonts: [{ name: "Noto Sans SC", data: await fontData, weight: 400, style: "normal" }] },
  );
}
