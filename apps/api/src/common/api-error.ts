import type { ApiErrorCode, ApiErrorDetail } from "@daytrace/contracts";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    readonly publicMessage: string,
    readonly details: readonly ApiErrorDetail[] = [],
  ) {
    super(publicMessage);
    this.name = "ApiError";
  }
}

export class ContentSnapshotInvalidError extends ApiError {
  constructor(details: readonly ApiErrorDetail[]) {
    super(503, "CONTENT_SNAPSHOT_INVALID", "公开内容快照未通过校验", details);
    this.name = "ContentSnapshotInvalidError";
  }
}

export class ContentSnapshotUnavailableError extends ApiError {
  constructor() {
    super(503, "CONTENT_SNAPSHOT_UNAVAILABLE", "公开内容快照暂时不可读取");
    this.name = "ContentSnapshotUnavailableError";
  }
}

export class RecordNotFoundError extends ApiError {
  constructor() {
    super(404, "RECORD_NOT_FOUND", "记录不存在或当前不可见");
    this.name = "RecordNotFoundError";
  }
}

export class AssetNotFoundError extends ApiError {
  constructor() {
    super(404, "ASSET_NOT_FOUND", "附件不存在或当前不可见");
    this.name = "AssetNotFoundError";
  }
}

export function invalidRecordId(): ApiError {
  return new ApiError(400, "INVALID_RECORD_ID", "记录 ID 格式无效", [
    { parameter: "recordId", message: "需要完整的 rec_ 小写 UUID" },
  ]);
}

export function invalidAssetId(): ApiError {
  return new ApiError(400, "INVALID_ASSET_ID", "附件 ID 格式无效", [
    { parameter: "assetId", message: "需要完整的 ast_ 小写 UUID" },
  ]);
}

export function invalidQuery(message: string, parameter: string): ApiError {
  return new ApiError(400, "INVALID_QUERY", "查询参数无效", [{ parameter, message }]);
}

export function authRequired(): ApiError {
  return new ApiError(401, "AUTH_REQUIRED", "主人访问需要有效会话");
}
