import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { getAuthRole, isStaffSignedIn } from "../constants/adminAccount";

/** ROLE_DEVELOPER 계정만 Developer Console에 진입 */
export default function RequireDeveloperAuth({ children }: { children: ReactNode }) {
  if (!isStaffSignedIn()) {
    return <Navigate to="/login" replace />;
  }
  const role = getAuthRole();
  if (role === "ADMIN") {
    return <Navigate to="/admin/orders" replace />;
  }
  if (role !== "DEVELOPER") {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
