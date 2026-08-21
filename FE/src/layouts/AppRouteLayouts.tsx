import { Outlet } from "react-router-dom";
import AppErrorBoundary from "../components/AppErrorBoundary";
import RequireAdminAuth from "../components/RequireAdminAuth";
import RequireDeveloperAuth from "../components/RequireDeveloperAuth";
import { PwaEntryTracker } from "../components/PwaEntry";
import { AdminDataProvider } from "../store/AdminDataContext";

export function AdminLayout() {
  return (
    <RequireAdminAuth>
      <AdminDataProvider>
        <Outlet />
      </AdminDataProvider>
    </RequireAdminAuth>
  );
}

export function RootLayout() {
  return (
    <AppErrorBoundary>
      <PwaEntryTracker />
      <Outlet />
    </AppErrorBoundary>
  );
}

export function DeveloperLayout() {
  return (
    <RequireDeveloperAuth>
      <Outlet />
    </RequireDeveloperAuth>
  );
}
