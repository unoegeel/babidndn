/** Frontend reporter 내부 source (소문자) */
export type FrontendErrorSource =
  | "window"
  | "unhandledrejection"
  | "react"
  | "api";

/** Backend ClientErrorSource enum JSON 값 */
export type BackendClientErrorSource =
  | "WINDOW"
  | "UNHANDLED_REJECTION"
  | "REACT"
  | "API";

/** POST /api/client-errors 요청 body */
export interface ClientErrorPayload {
  timestamp: string;
  source: BackendClientErrorSource;
  errorName: string;
  message: string;
  stack?: string;
  componentStack?: string;
  route: string;
  /** 연관 Backend API 요청의 X-Request-Id (tracking 요청 자체 ID와 별개) */
  relatedRequestId?: string;
  userAgent?: string;
  browser?: string;
  platform?: string;
}

/** reportFrontendError 입력 */
export interface FrontendErrorInput {
  source: FrontendErrorSource;
  error?: unknown;
  message?: string;
  errorName?: string;
  stack?: string;
  componentStack?: string;
  route?: string;
  relatedRequestId?: string;
}

/** ApiError 등에 부착 가능한 연관 requestId */
export interface RelatedRequestIdCarrier {
  relatedRequestId?: string;
}

export const CLIENT_ERROR_API_PATH = "/api/client-errors";

export const REQUEST_ID_HEADER = "X-Request-Id";

export const FRONTEND_TO_BACKEND_SOURCE: Record<
  FrontendErrorSource,
  BackendClientErrorSource
> = {
  window: "WINDOW",
  unhandledrejection: "UNHANDLED_REJECTION",
  react: "REACT",
  api: "API",
};
