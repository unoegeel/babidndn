import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { getAuthRole, isStaffSignedIn } from "../constants/adminAccount";

/** ROLE_ADMIN 계정만 사장님 관리자 화면에 진입 */
export default function RequireAdminAuth({ children }: { children: ReactNode }) {
  if (!isStaffSignedIn()) {
    return <Navigate to="/login" replace />;
  }
  const role = getAuthRole();
  if (role === "DEVELOPER") {
    return <Navigate to="/dev" replace />;
  }
  if (role !== "ADMIN") {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
