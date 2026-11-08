import type { RecordDetail, RecordSummary } from "@daytrace/contracts";
export interface Library { items: RecordSummary[]; contentRevision: string }
export interface ImportPreview { id: string; baseRevision: string; createdAt: string; records: RecordDetail[]; previousRecords: RecordDetail[] }
export interface Version { snapshot: string; createdAt: string; action: string; record: RecordSummary }
export async function managementRequest<T>(path: string, body?: unknown): Promise<T> {
  let csrf: string | undefined;
  if (body !== undefined) {
    const response = await fetch("/api/v1/auth/csrf", { cache: "no-store" });
    if (!response.ok) throw new Error(response.status === 401 ? "主人会话已过期，请返回主人空间重新登录。" : "暂时无法校验操作，请重试。");
    csrf = (await response.json()).csrfToken;
  }
  const multipart = body instanceof FormData;
  const response = await fetch(`/api/v1/owner/${path}`, {
    method: body === undefined ? "GET" : "POST", cache: "no-store", credentials: "same-origin",
    headers: body === undefined ? {} : { "x-csrf-token": csrf!, ...(multipart ? {} : { "content-type": "application/json" }) },
    ...(body === undefined ? {} : { body: multipart ? body : JSON.stringify(body) }),
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error("主人会话已过期，请返回主人空间重新登录。");
    const payload = await response.json().catch(() => null);
    const details = payload?.error?.details?.map((d: { file?: string; message?: string }) => `${d.file ?? ""} ${d.message ?? ""}`.trim()).join("；");
    throw new Error(details || payload?.error?.message || "操作没有完成，请稍后重试。");
  }
  return response.json() as Promise<T>;
}
export const typeLabels = { engineering: "技术实践", recipe: "生活 / 菜谱", reflection: "随想" };
export const statusLabels = { draft: "草稿", published: "已发布", archived: "已归档" };
