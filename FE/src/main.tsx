import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider, Outlet } from "react-router-dom";
import "./index.css";
import { startAppHeightSync } from "./utils/appHeight";
import { AdminDataProvider } from "./store/AdminDataContext";
import RequireAdminAuth from "./components/RequireAdminAuth";
import { HomeRedirect, PwaEntryTracker } from "./components/PwaEntry";
import LoginPage from "./pages/owner/LoginPage";
import SignupPage from "./pages/owner/SignupPage";
import OrdersDashboardPage from "./pages/owner/OrdersDashboardPage";
import MenuManagementPage from "./pages/owner/MenuManagementPage";
import PaymentHistoryPage from "./pages/owner/PaymentHistoryPage";
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
import OrderHistoryPage from "./pages/user/OrderHistoryPage";
import ReviewPage from "./pages/user/ReviewPage";
import NoticesPage from "./pages/user/NoticesPage";

import PaymentSuccessPage from "./pages/user/PaymentSuccessPage";
import PaymentFailPage from "./pages/user/PaymentFailPage";

// 태블릿/모바일 브라우저 상·하단 UI를 반영한 가시 높이 동기화
startAppHeightSync();

// 관리자 화면 공통 래퍼: 로그인 확인 + 서버 데이터 스토어
function adminPage(page: ReactNode) {
  return (
    <RequireAdminAuth>
      <AdminDataProvider>{page}</AdminDataProvider>
    </RequireAdminAuth>
  );
}

function RootLayout() {
  return (
    <>
      <PwaEntryTracker />
      <Outlet />
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <HomeRedirect /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/signup", element: <SignupPage /> },
      { path: "/admin", element: <Navigate to="/admin/orders" replace /> },
      { path: "/admin/orders", element: adminPage(<OrdersDashboardPage />) },
      { path: "/admin/menus", element: adminPage(<MenuManagementPage />) },
      { path: "/admin/payments", element: adminPage(<PaymentHistoryPage />) },
      { path: "/admin/store", element: adminPage(<StoreManagementPage />) },
      { path: "/admin/store/reviews", element: adminPage(<StoreReviewsPage />) },
      { path: "/admin/settings", element: adminPage(<SettingsPage />) },
      {
        path: "/user",
        element: (
          <UserDataProvider>
            <UserShell />
          </UserDataProvider>
        ),
        children: [
          { index: true, element: <MenuPage /> },
          { path: "cart", element: <CartPage /> },
          { path: "checkout", element: <CheckoutPage /> },
          { path: "payment/success", element: <PaymentSuccessPage /> },
          { path: "payment/fail", element: <PaymentFailPage /> },
          { path: "orders", element: <OrderHistoryPage /> },
          { path: "notices", element: <NoticesPage /> },
          { path: "reviews", element: <ReviewPage /> },
          { path: "orders/:orderId", element: <OrderStatusPage /> },
          { path: "orders/:orderId/complete", element: <OrderCompletePage /> },
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
