import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";

const ENTRY_KEY = "babi_pwa_entry";

export type PwaEntry = "user" | "admin";

/** 유저/관리자 화면 방문 시 PWA 시작 경로 기억 */
export function rememberPwaEntry(entry: PwaEntry) {
  try {
    localStorage.setItem(ENTRY_KEY, entry);
  } catch {
    // 저장소 불가 시 무시
  }
}

function readPwaEntry(): PwaEntry {
  try {
    const value = localStorage.getItem(ENTRY_KEY);
    if (value === "admin" || value === "user") return value;
  } catch {
    // ignore
  }
  // 첫 설치·기록 없음 → 주문 고객용
  return "user";
}

/** 경로에 따라 마지막 진입 모드를 저장하는 트래커 */
export function PwaEntryTracker() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname.startsWith("/user")) {
      rememberPwaEntry("user");
    } else if (
      pathname.startsWith("/login") ||
      pathname.startsWith("/signup") ||
      pathname.startsWith("/admin")
    ) {
      rememberPwaEntry("admin");
    }
  }, [pathname]);

  return null;
}

/** PWA start_url(/) — 마지막 사용 모드로 분기 */
export function HomeRedirect() {
  const entry = readPwaEntry();
  return <Navigate to={entry === "admin" ? "/login" : "/user"} replace />;
}
