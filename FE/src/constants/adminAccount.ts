/**
 * 사장님/개발자 로그인 세션 관리
 *
 * 로그인은 서버 API(POST /api/admin/auth/login)로 처리하고,
 * 발급받은 액세스 토큰을 탭이 닫히면 사라지는 sessionStorage 에 보관합니다.
 */
import { resolveAuthRole, type AuthRole } from "../utils/authToken";

const TOKEN_KEY = "gdgoc-admin-token";

/** 로그인 성공 시 발급받은 액세스 토큰 저장 */
export function signInAdmin(accessToken: string) {
  sessionStorage.setItem(TOKEN_KEY, accessToken);
}

export function signOutAdmin() {
  sessionStorage.removeItem(TOKEN_KEY);
}

/** 저장된 액세스 토큰 (없으면 null) */
export function getAdminToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getAuthRole(): AuthRole | null {
  return resolveAuthRole(getAdminToken());
}

export function isAdminSignedIn(): boolean {
  return getAuthRole() === "ADMIN";
}

export function isDeveloperSignedIn(): boolean {
  return getAuthRole() === "DEVELOPER";
}

export function isStaffSignedIn(): boolean {
  return getAuthRole() !== null;
}
