// API 요청을 위한 가벼운 fetch 래퍼입니다.
// 웹·API 도메인이 분리되어 있으므로 호스트명으로 API 서버를 고릅니다.
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

/** @deprecated resolveApiBaseUrl() 사용 권장 — 런타임마다 재계산됩니다 */
export const BASE_URL = resolveApiBaseUrl();

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
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, code?: string, message?: string) {
    super(message && message.trim() ? message : `API 요청 실패: ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  baseUrl?: string;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, baseUrl, ...rest } = options;
  const root = baseUrl ?? resolveApiBaseUrl();

  // 관리자 로그인 후에는 모든 요청에 Bearer 토큰을 함께 보냅니다.
  const token = getAdminToken();

  const response = await fetch(`${root}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();

  if (!response.ok) {
    let parsed: ApiErrorBody | null = null;
    try {
      parsed = JSON.parse(text) as ApiErrorBody;
    } catch {
      // JSON 이 아닌 오류 응답은 상태 코드만 사용
    }
    // 토큰 만료 등으로 인증이 풀리면 저장된 토큰을 제거해 로그인 화면으로 유도
    if (response.status === 401 && token) {
      signOutAdmin();
    }
    throw new ApiError(response.status, parsed?.code, parsed?.message);
  }

  // 응답 본문이 없는 경우(204 등)를 대비
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PUT", body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
