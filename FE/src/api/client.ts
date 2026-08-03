// API 요청을 위한 가벼운 fetch 래퍼입니다.
// 기본값은 운영 서버이며, .env 의 VITE_API_BASE_URL 로 덮어쓸 수 있습니다.
import { getAdminToken, signOutAdmin } from "../constants/adminAccount";

// 개발 서버에서는 vite 프록시(같은 오리진의 /api)를 타고,
// 배포 빌드에서는 운영 서버를 직접 호출합니다.
export const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? "" : "https://babidndn.shop");

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
    super(message ?? `API 요청 실패: ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;

  // 관리자 로그인 후에는 모든 요청에 Bearer 토큰을 함께 보냅니다.
  const token = getAdminToken();

  const response = await fetch(`${BASE_URL}${path}`, {
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
