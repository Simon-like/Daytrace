import type { RecordDetail, RecordSummary } from "@daytrace/contracts";
export interface Library { items: RecordSummary[]; contentRevision: string }
export interface ImportPreview { id: string; baseRevision: string; createdAt: string; records: RecordDetail[]; previousRecords: RecordDetail[] }
export interface Version { snapshot: string; createdAt: string; action: string; record: RecordSummary }

export class ManagementRequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); this.name = "ManagementRequestError"; }
}
const expiredMessage = "主人会话已过期，请重新登录。";
let sessionEpoch = 0;
const expirationListeners = new Set<() => void>();
export function onManagementSessionExpired(listener: () => void): () => void {
  expirationListeners.add(listener);
  return () => { expirationListeners.delete(listener); };
}
function checkSession(epoch: number): void {
  if (epoch !== sessionEpoch) throw new ManagementRequestError(expiredMessage, 401);
}
function ensureAuthorized(response: Response, epoch: number): void {
  checkSession(epoch);
  if (response.status === 401) {
    sessionEpoch += 1;
    expirationListeners.forEach(listener => listener());
    throw new ManagementRequestError(expiredMessage, 401);
  }
}
export async function managementRequest<T>(path: string, body?: unknown): Promise<T> {
  const epoch = sessionEpoch;
  try {
    let csrf: string | undefined;
    if (body !== undefined) {
      const response = await fetch("/api/v1/auth/csrf", { cache: "no-store" });
      ensureAuthorized(response, epoch);
      if (!response.ok) throw new ManagementRequestError("暂时无法校验操作，请重试。", response.status);
      csrf = (await response.json()).csrfToken;
      checkSession(epoch);
    }
    const multipart = body instanceof FormData;
    const response = await fetch(`/api/v1/owner/${path}`, {
      method: body === undefined ? "GET" : "POST", cache: "no-store", credentials: "same-origin",
      headers: body === undefined ? {} : { "x-csrf-token": csrf!, ...(multipart ? {} : { "content-type": "application/json" }) },
      ...(body === undefined ? {} : { body: multipart ? body : JSON.stringify(body) }),
    });
    ensureAuthorized(response, epoch);
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      checkSession(epoch);
      const details = payload?.error?.details?.map((d: { file?: string; message?: string }) => `${d.file ?? ""} ${d.message ?? ""}`.trim()).join("；");
      throw new ManagementRequestError(details || payload?.error?.message || "操作没有完成，请稍后重试。", response.status);
    }
    const result = await response.json() as T;
    checkSession(epoch);
    return result;
  } catch (error) {
    checkSession(epoch);
    throw error;
  }
}
export const typeLabels = { engineering: "技术实践", recipe: "生活 / 菜谱", reflection: "随想" };
export const statusLabels = { draft: "草稿", published: "已发布", archived: "已归档" };
