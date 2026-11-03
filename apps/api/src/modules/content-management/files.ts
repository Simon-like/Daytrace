import { Unzip, UnzipInflate, zipSync } from "fflate";
import { ApiError } from "../../common/api-error";

export interface InputFile { path: string; bytes: Buffer }
export const MAX_UPLOAD = 32 * 1024 * 1024;
export const MAX_EXPANDED = 64 * 1024 * 1024;
export function invalid(message: string, file?: string): ApiError {
  return new ApiError(422, "CONTENT_IMPORT_INVALID", message, [{ message, ...(file ? { file } : {}) }]);
}
export function safePath(path: string): boolean {
  // eslint-disable-next-line no-control-regex
  return path.length <= 512 && !/[\\\x00-\x1f:#?]/.test(path) && !path.startsWith("/") &&
    path.split("/").length <= 12 && path.split("/").every(p => p !== "" && p !== "." && p !== ".." && !p.startsWith("."));
}
export function unpack(files: InputFile[]): InputFile[] {
  if (!files.length || files.length > 1000 || files.reduce((n, f) => n + f.bytes.length, 0) > MAX_UPLOAD) throw invalid("请选择文件；上传总量不超过 32 MiB，最多 1000 个文件。");
  const result: InputFile[] = [];
  let total = 0;
  const add = (path: string, bytes: Buffer): void => {
    if (path.startsWith("__MACOSX/") || path.split("/").includes(".DS_Store")) return;
    if (!safePath(path) || /\.(zip|html?|svg|mdx)$/i.test(path)) throw invalid("文件路径或类型不受支持", path);
    total += bytes.length;
    if (total > MAX_EXPANDED || bytes.length > 20 * 1024 * 1024 || result.length >= 1000) throw invalid("展开内容超限：最多 64 MiB、1000 个文件，单附件 20 MiB。");
    if (result.some(f => f.path === path.normalize("NFC"))) throw invalid("文件路径重复", path);
    result.push({ path: path.normalize("NFC"), bytes });
  };
  for (const file of files) {
    if (!/\.zip$/i.test(file.path)) { add(file.path, file.bytes); continue; }
    // Streaming inflate aborts before allocating the full decompressed archive.
    let failure: Error | undefined;
    // Check central-directory flags and Unix file type. Never materialize symlinks.
    for (let offset = 0; offset + 46 <= file.bytes.length; offset++) {
      if (file.bytes.readUInt32LE(offset) !== 0x02014b50) continue;
      const flags = file.bytes.readUInt16LE(offset + 8);
      const mode = file.bytes.readUInt32LE(offset + 38) >>> 16;
      if (flags & 1 || (mode & 0xf000) === 0xa000) throw invalid("ZIP 不能包含加密文件或符号链接");
      const length = file.bytes.readUInt16LE(offset + 28) + file.bytes.readUInt16LE(offset + 30) + file.bytes.readUInt16LE(offset + 32);
      offset += 45 + length;
    }
    const unzip = new Unzip(entry => {
      if (failure) return;
      if (entry.name.endsWith("/")) return;
      if (entry.name.startsWith("__MACOSX/") || entry.name.split("/").includes(".DS_Store")) return;
      if (!safePath(entry.name) || /\.(zip|html?|svg|mdx)$/i.test(entry.name)) { failure = invalid("压缩包包含不支持的路径或类型", entry.name); return; }
      if (entry.originalSize !== undefined && (entry.originalSize > 20 * 1024 * 1024 || entry.originalSize > Math.max(1024 * 1024, (entry.size ?? 0) * 200))) {
        failure = invalid("压缩包内文件过大或压缩比异常", entry.name); return;
      }
      const chunks: Uint8Array[] = []; let size = 0;
      entry.ondata = (error, data, final) => {
        if (error) { failure = invalid("压缩包无法读取", entry.name); return; }
        size += data.length;
        if (total + size > MAX_EXPANDED || size > 20 * 1024 * 1024) { entry.terminate(); failure = invalid("压缩包展开内容超限"); return; }
        chunks.push(data);
        if (final && !failure) { try { add(entry.name, Buffer.concat(chunks)); } catch (e) { failure = e as Error; } }
      };
      entry.start();
    });
    unzip.register(UnzipInflate);
    try { for (let offset = 0; offset < file.bytes.length && !failure; offset += 4096) unzip.push(file.bytes.subarray(offset, offset + 4096), offset + 4096 >= file.bytes.length); } catch { throw failure ?? invalid("ZIP 损坏、加密或格式不受支持"); }
    if (failure) throw failure;
  }
  if (!result.length) throw invalid("没有可导入的文件");
  for (const file of result) if (!/\.md$/i.test(file.path)) mediaType(file);
  return result;
}
export function mediaType(file: InputFile): "image/png" | "image/jpeg" | "image/webp" | "image/gif" | "application/pdf" | "text/plain" {
  const b = file.bytes;
  const ext = file.path.split(".").pop()?.toLowerCase();
  if (ext === "png" && b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return "image/png";
  if ((ext === "jpg" || ext === "jpeg") && b[0] === 255 && b[1] === 216 && b[2] === 255) return "image/jpeg";
  if (ext === "webp" && b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP") return "image/webp";
  if (ext === "gif" && /^GIF8[79]a$/.test(b.subarray(0, 6).toString())) return "image/gif";
  if (ext === "pdf" && b.subarray(0, 5).toString() === "%PDF-") return "application/pdf";
  if (ext === "txt" && !b.includes(0)) { try { new TextDecoder("utf-8", { fatal: true }).decode(b); return "text/plain"; } catch { /* reject */ } }
  throw invalid("附件格式不支持，或内容与扩展名不符", file.path);
}
export function archive(files: InputFile[]): Buffer {
  return Buffer.from(zipSync(Object.fromEntries(files.map(f => [f.path, f.bytes])), { level: 6 }));
}
