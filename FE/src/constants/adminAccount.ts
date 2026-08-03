/**
 * 사장님 로그인 세션 관리
 *
 * 로그인은 서버 API(POST /api/admin/auth/login)로 처리하고,
 * 발급받은 액세스 토큰을 탭이 닫히면 사라지는 sessionStorage 에 보관합니다.
 */
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
    // 사파리 프라이빗 모드 등 저장소 접근 불가 시 로그인 안 된 것으로 취급
    return null;
  }
}

export function isAdminSignedIn(): boolean {
  return getAdminToken() !== null;
}
