import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { isAdminSignedIn } from "../constants/adminAccount";

/** 사장님 계정으로 로그인한 경우에만 관리자 화면에 진입할 수 있도록 보호 */
export default function RequireAdminAuth({ children }: { children: ReactNode }) {
  if (!isAdminSignedIn()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
