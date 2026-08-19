import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider, Outlet } from "react-router-dom";
import "./index.css";
import { startAppHeightSync } from "./utils/appHeight";
import { initFrontendErrorTracking } from "./utils/frontendError/initFrontendErrorTracking";
import AppErrorBoundary from "./components/AppErrorBoundary";
import { AdminDataProvider } from "./store/AdminDataContext";
import RequireAdminAuth from "./components/RequireAdminAuth";
import { HomeRedirect, PwaEntryTracker } from "./components/PwaEntry";
import LoginPage from "./pages/owner/LoginPage";
import SignupPage from "./pages/owner/SignupPage";
import OrdersDashboardPage from "./pages/owner/OrdersDashboardPage";
import MenuManagementPage from "./pages/owner/MenuManagementPage";
import PaymentHistoryPage from "./pages/owner/PaymentHistoryPage";
import SalesAnalyticsPage from "./pages/owner/SalesAnalyticsPage";
import SettingsPage from "./pages/owner/SettingsPage";
import StoreManagementPage from "./pages/owner/StoreManagementPage";
import StoreReviewsPage from "./pages/owner/StoreReviewsPage";

// 학생용 컴포넌트 임포트
import { UserDataProvider } from "./store/UserDataContext";
import UserShell from "./components/user/UserShell";
import MenuPage from "./pages/user/MenuPage";
import CartPage from "./pages/user/CartPage";
import CheckoutPage from "./pages/user/CheckoutPage";
import OrderStatusPage from "./pages/user/OrderStatusPage";
import OrderCompletePage from "./pages/user/OrderCompletePage";
import OrderReceiptPage from "./pages/user/OrderReceiptPage";
import OrderHistoryPage from "./pages/user/OrderHistoryPage";
import ReviewPage from "./pages/user/ReviewPage";
import NoticesPage from "./pages/user/NoticesPage";
import ContactPage from "./pages/user/ContactPage";
import RefundPolicyPage from "./pages/user/RefundPolicyPage";
import UserGuidePage from "./pages/user/UserGuidePage";
import MyMenuPage from "./pages/user/MyMenuPage";

import PaymentSuccessPage from "./pages/user/PaymentSuccessPage";
import PaymentFailPage from "./pages/user/PaymentFailPage";

import RequireDeveloperAuth from "./components/RequireDeveloperAuth";
import DeveloperOverviewPage from "./pages/developer/DeveloperOverviewPage";
import DeveloperErrorsPage from "./pages/developer/DeveloperErrorsPage";
import DeveloperRequestsPage from "./pages/developer/DeveloperRequestsPage";
import DeveloperEventsPage from "./pages/developer/DeveloperEventsPage";
import DeveloperAnalyticsPage from "./pages/developer/DeveloperAnalyticsPage";

// 태블릿/모바일 브라우저 상·하단 UI를 반영한 가시 높이 동기화
startAppHeightSync();
initFrontendErrorTracking();

/**
 * 관리자 영역 공통 레이아웃.
 * RequireAdminAuth + AdminDataProvider를 라우트 트리에서 1회만 마운트해
 * /admin/* 이동 시 Context 상태·초기 API 호출이 리셋되지 않도록 합니다.
 */
function AdminLayout() {
  return (
    <RequireAdminAuth>
      <AdminDataProvider>
        <Outlet />
      </AdminDataProvider>
    </RequireAdminAuth>
  );
}

function RootLayout() {
  return (
    <AppErrorBoundary>
      <PwaEntryTracker />
      <Outlet />
    </AppErrorBoundary>
  );
}

function DeveloperLayout() {
  return (
    <RequireDeveloperAuth>
      <Outlet />
    </RequireDeveloperAuth>
  );
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <HomeRedirect /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/signup", element: <SignupPage /> },
      {
        path: "/admin",
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to="orders" replace /> },
          { path: "orders", element: <OrdersDashboardPage /> },
          { path: "menus", element: <MenuManagementPage /> },
          { path: "payments", element: <PaymentHistoryPage /> },
          { path: "sales", element: <SalesAnalyticsPage /> },
          { path: "store", element: <StoreManagementPage /> },
          { path: "store/reviews", element: <StoreReviewsPage /> },
          { path: "settings", element: <SettingsPage /> },
        ],
      },
      {
        path: "/dev",
        element: <DeveloperLayout />,
        children: [
          { index: true, element: <DeveloperOverviewPage /> },
          { path: "errors", element: <DeveloperErrorsPage /> },
          { path: "requests", element: <DeveloperRequestsPage /> },
          { path: "events", element: <DeveloperEventsPage /> },
          { path: "analytics", element: <DeveloperAnalyticsPage /> },
        ],
      },
      {
        path: "/user",
        element: (
          <UserDataProvider>
            <UserShell />
          </UserDataProvider>
        ),
        children: [
          { index: true, element: <MenuPage /> },
          { path: "my-menu", element: <MyMenuPage /> },
          { path: "cart", element: <CartPage /> },
          { path: "checkout", element: <CheckoutPage /> },
          { path: "payment/success", element: <PaymentSuccessPage /> },
          { path: "payment/fail", element: <PaymentFailPage /> },
          { path: "orders", element: <OrderHistoryPage /> },
          { path: "notices", element: <NoticesPage /> },
          { path: "reviews", element: <ReviewPage /> },
          { path: "guide", element: <UserGuidePage /> },
          { path: "contact", element: <ContactPage /> },
          { path: "refund-policy", element: <RefundPolicyPage /> },
          { path: "orders/:orderId", element: <OrderStatusPage /> },
          { path: "orders/:orderId/complete", element: <OrderCompletePage /> },
          { path: "orders/:orderId/receipt", element: <OrderReceiptPage /> },
        ],
      },
      { path: "*", element: <HomeRedirect /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
