export type AuthRole = "ADMIN" | "DEVELOPER";

export interface JwtPayload {
  sub?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

function decodeBase64Url(value: string): string {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  return atob(base64);
}

/** JWT payload 파싱 (서명 검증 없음 — UX 가드용, 최종 권한은 Backend) */
export function parseJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const json = decodeBase64Url(parts[1]);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function resolveAuthRole(token: string | null): AuthRole | null {
  if (!token) return null;
  const role = parseJwtPayload(token)?.role;
  if (role === "ADMIN" || role === "DEVELOPER") {
    return role;
  }
  return null;
}
