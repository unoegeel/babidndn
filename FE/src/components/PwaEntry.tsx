import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { readPwaEntry, rememberPwaEntry } from "../utils/pwaEntry";

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
