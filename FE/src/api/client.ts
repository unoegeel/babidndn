import type { RelatedRequestIdCarrier } from "../types/clientError";
import { REQUEST_ID_HEADER } from "../types/clientError";
import { reportApiProcessingError } from "../utils/frontendError/reportFrontendError";
// 웹·API 도메인이 분리되어 있으므로 호스트명으로 API 서버를 고릅니다.
// 공개 요청(api)과 관리자 인증 요청(adminApi)을 분리해
// 일반 API가 관리자 Bearer·세션에 종속되지 않도록 합니다.
import { getAdminToken, signOutAdmin } from "../constants/adminAccount";

/** 주문·결제 API 호출 시 사용한 서버 (결제 승인 시 동일 서버 보장) */
export const ORDER_API_BASE_SESSION_KEY = "orderApiBaseUrl";

/**
 * 웹 도메인 → API 도메인
 * - main web: www.babidndn.shop → main api: babidndn.shop
 * - dev web:  dev.babidndn.shop → dev api:  dev-api.babidndn.shop
 */
const WEB_HOST_TO_API_BASE: Record<string, string> = {
  "www.babidndn.shop": "https://babidndn.shop",
  "babidndn.shop": "https://babidndn.shop",
  "dev.babidndn.shop": "https://dev-api.babidndn.shop",
};

function readEnvApiBaseUrl(): string | undefined {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/\/$/, "");
}

/**
 * 현재 접속 환경에 맞는 API 베이스 URL.
 * 1) 알려진 웹 도메인 → 고정 API 매핑 (Vercel 프로젝트별 env 오설정 방지)
 * 2) VITE_API_BASE_URL (프리뷰·로컬 등)
 * 3) 로컬 dev는 vite 프록시(""), 그 외 운영 API
 */
export function resolveApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const mapped = WEB_HOST_TO_API_BASE[window.location.hostname];
    if (mapped) {
      return mapped;
    }
  }

  const fromEnv = readEnvApiBaseUrl();
  if (fromEnv !== undefined) {
    return fromEnv;
  }

  if (import.meta.env.DEV) {
    return "";
  }

  return "https://babidndn.shop";
}

export function rememberOrderApiBaseUrl(baseUrl: string = resolveApiBaseUrl()): void {
  try {
    sessionStorage.setItem(ORDER_API_BASE_SESSION_KEY, baseUrl);
    localStorage.setItem(ORDER_API_BASE_SESSION_KEY, baseUrl);
  } catch {
    // 저장소 불가 시 무시
  }
}

export function getOrderApiBaseUrl(): string {
  try {
    const fromSession = sessionStorage.getItem(ORDER_API_BASE_SESSION_KEY);
    if (fromSession !== null && fromSession !== "") {
      return fromSession;
    }
    const fromLocal = localStorage.getItem(ORDER_API_BASE_SESSION_KEY);
    if (fromLocal !== null && fromLocal !== "") {
      return fromLocal;
    }
  } catch {
    // ignore
  }
  return resolveApiBaseUrl();
}

export function clearOrderApiBaseUrl(): void {
  try {
    sessionStorage.removeItem(ORDER_API_BASE_SESSION_KEY);
    localStorage.removeItem(ORDER_API_BASE_SESSION_KEY);
  } catch {
    // ignore
  }
}

/** 서버 공통 오류 응답 형식 (MenuErrorResponse 등) */
interface ApiErrorBody {
  status?: number;
  code?: string;
  message?: string;
}

/** HTTP 상태 코드와 서버 오류 코드를 함께 담는 에러 */
export class ApiError extends Error implements RelatedRequestIdCarrier {
  readonly status: number;
  readonly code?: string;
  readonly relatedRequestId?: string;

  constructor(status: number, code?: string, message?: string, relatedRequestId?: string) {
    super(message && message.trim() ? message : `API 요청 실패: ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.relatedRequestId = relatedRequestId;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  baseUrl?: string;
};

type AuthMode = "public" | "admin";

export interface ApiCallResult<T> {
  data: T;
  relatedRequestId?: string;
}

function readResponseRequestId(response: Response): string | undefined {
  const header = response.headers.get(REQUEST_ID_HEADER)
    ?? response.headers.get(REQUEST_ID_HEADER.toLowerCase());
  if (!header || header.trim() === "") {
    return undefined;
  }
  return header.trim();
}

function attachRelatedRequestId(error: unknown, relatedRequestId?: string): never {
  if (error instanceof Error && relatedRequestId) {
    (error as Error & RelatedRequestIdCarrier).relatedRequestId = relatedRequestId;
  }
  throw error;
}

async function requestInternal<T>(
  path: string,
  options: RequestOptions = {},
  authMode: AuthMode = "public",
): Promise<ApiCallResult<T>> {
  const { body, headers, baseUrl, ...rest } = options;
  const root = baseUrl ?? resolveApiBaseUrl();

  const token = authMode === "admin" ? getAdminToken() : null;

  const response = await fetch(`${root}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const relatedRequestId = readResponseRequestId(response);
  const text = await response.text();

  if (!response.ok) {
    let parsed: ApiErrorBody | null = null;
    try {
      parsed = JSON.parse(text) as ApiErrorBody;
    } catch {
      // JSON 이 아닌 오류 응답은 상태 코드만 사용
    }
    if (response.status === 401 && authMode === "admin" && token) {
      signOutAdmin();
    }
    throw new ApiError(response.status, parsed?.code, parsed?.message, relatedRequestId);
  }

  if (!text) {
    return { data: undefined as T, relatedRequestId };
  }

  try {
    return { data: JSON.parse(text) as T, relatedRequestId };
  } catch (parseError) {
    reportApiProcessingError(parseError, relatedRequestId);
    return attachRelatedRequestId(parseError, relatedRequestId);
  }
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
  authMode: AuthMode = "public",
): Promise<T> {
  const { data } = await requestInternal<T>(path, options, authMode);
  return data;
}

function createClient(authMode: AuthMode) {
  return {
    get: <T>(path: string, options?: RequestOptions) =>
      request<T>(path, { ...options, method: "GET" }, authMode),
    post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
      request<T>(path, { ...options, method: "POST", body }, authMode),
    postWithMeta: <T>(path: string, body?: unknown, options?: RequestOptions) =>
      requestInternal<T>(path, { ...options, method: "POST", body }, authMode),
    patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
      request<T>(path, { ...options, method: "PATCH", body }, authMode),
    put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
      request<T>(path, { ...options, method: "PUT", body }, authMode),
    delete: <T>(path: string, options?: RequestOptions) =>
      request<T>(path, { ...options, method: "DELETE" }, authMode),
  };
}

/** 공개·사용자 API (Authorization / signOutAdmin 없음) */
export const api = createClient("public");

/** 관리자 인증이 필요한 API (Bearer + 401 시 signOutAdmin) */
export const adminApi = createClient("admin");
