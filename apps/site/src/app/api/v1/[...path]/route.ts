import { parseSiteRuntimeConfig } from "@daytrace/config";

export const dynamic = "force-dynamic";
const ownerEndpoint = /^owner\/(?:content(?:\/rec_[0-9a-f-]{36}(?:\/(?:history|export))?)?|imports(?:\/[0-9a-f-]{36}(?:\/(?:commit|discard|assets\/ast_[0-9a-f-]{36}))?)?)$/;
const allowed = /^(?:records(?:\/tags|\/rec_[0-9a-f-]{36}|\/resolve\/[a-z0-9-]{1,80})?|search|assets\/ast_[0-9a-f-]{36}|auth\/(?:login|callback|session|csrf|logout|revoke-all)|health\/(?:live|ready))$/;

async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const endpoint = path.join("/");
  if ((!allowed.test(endpoint) && !ownerEndpoint.test(endpoint)) || request.method === "POST" && !/^auth\/(logout|revoke-all)$/.test(endpoint) && !/^owner\/(?:imports(?:\/[0-9a-f-]{36}\/(?:commit|discard))?|content\/rec_[0-9a-f-]{36})$/.test(endpoint)) {
    return new Response("Not found", { status: 404 });
  }
  const headers = new Headers({ accept: request.headers.get("accept") ?? "application/json" });
  for (const key of ["content-type", "origin", "sec-fetch-site", "x-csrf-token"]) {
    const value = request.headers.get(key);
    if (value !== null) headers.set(key, value);
  }
  const url = new URL(request.url);
  if (endpoint.startsWith("owner/") || endpoint.startsWith("auth/") || endpoint.startsWith("assets/") || url.searchParams.get("scope") === "owner") {
    const cookies = (request.headers.get("cookie") ?? "").split(";").map((value) => value.trim())
      .filter((value) => /^__Host-daytrace_(session|login)=[A-Za-z0-9_-]{43}$/.test(value));
    if (cookies.length) headers.set("cookie", cookies.join("; "));
  }
  try {
    const { apiInternalOrigin } = parseSiteRuntimeConfig(process.env);
    const target = new URL(`/api/v1/${endpoint}`, apiInternalOrigin);
    target.search = url.search;
    let body: ArrayBuffer | undefined;
    if (request.method === "POST") {
      const length = Number(request.headers.get("content-length"));
      const limit = endpoint === "owner/imports" ? 33 * 1024 * 1024 : 1024 * 1024;
      if (!Number.isFinite(length) || length > limit) return Response.json({ error: { message: "上传总量超过限制" } }, { status: 413 });
      const reader = request.body?.getReader();
      const chunks: Uint8Array[] = []; let size = 0;
      if (reader) while (true) {
        const chunk = await reader.read(); if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > limit) { await reader.cancel(); return Response.json({ error: { message: "上传总量超过限制" } }, { status: 413 }); }
        chunks.push(chunk.value);
      }
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      body = bytes.buffer;
    }
    const response = await fetch(target, {
      method: request.method, headers, cache: "no-store", redirect: "manual",
      ...(request.method === "POST" ? { body: body ?? null } : {}),
      signal: AbortSignal.timeout(endpoint.startsWith("owner/") ? 60_000 : 8_000),
    });
    const result = new Headers({ "cache-control": "private, no-store", "x-content-type-options": "nosniff" });
    for (const key of ["content-type", "content-length", "content-disposition", "location", "x-request-id"]) {
      const value = response.headers.get(key);
      if (value !== null) result.set(key, value);
    }
    for (const cookie of response.headers.getSetCookie()) result.append("set-cookie", cookie);
    return new Response(response.body, { status: response.status, headers: result });
  } catch {
    return Response.json({ schemaVersion: "1.0", error: {
      code: "INTERNAL_ERROR", message: "暂时无法连接内容服务，请稍后重试。", requestId: "site-upstream-unavailable", details: [],
    } }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}

export { proxy as GET, proxy as POST };
