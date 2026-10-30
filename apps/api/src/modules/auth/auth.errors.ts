import type { ApiErrorCode } from "@daytrace/contracts";
import { ApiError, authRequired } from "../../common/api-error";

// These two codes need to be added to the shared contract during integration.
export function csrfRejected(): ApiError {
  return new ApiError(403, "CSRF_REJECTED" as ApiErrorCode, "请求校验失败");
}

export function loginFailed(): ApiError {
  return new ApiError(401, "LOGIN_FAILED" as ApiErrorCode, "登录未完成，请重试");
}

export function ownerRequired(): ApiError {
  return new ApiError(403, "OWNER_REQUIRED", "当前身份无主人访问权限");
}

export { authRequired };
