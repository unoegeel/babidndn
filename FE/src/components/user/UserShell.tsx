import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useUserData } from "../../store/UserDataContext";
import {
  ensurePushSubscription,
  requestPermissionAndSubscribe,
} from "../../utils/webPush";
import ReadyOrderBanner from "./ReadyOrderBanner";
import { NotificationPanel } from "./NotificationPanel";
import { UserDrawer } from "./UserDrawer";
import { UserHeader } from "./UserHeader";
import UserPopupAd from "./UserPopupAd";
import ReadyConfetti from "./ReadyConfetti";


const NOTIF_PROMPT_SESSION_KEY = "babi_notif_prompt_shown";
const DRAWER_CLOSE_MS = 240;

/** 메뉴 ↔ 장바구니 ↔ 결제 스택 깊이 (뒤로가기 슬라이드 방향용) */
function checkoutStackDepth(pathname: string): number {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/user/checkout") return 2;
  if (p === "/user/cart") return 1;
  if (p === "/user") return 0;
  return -1;
}

export const UserShell: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const {
    cart,
    notifications,
    activeOrders,
    markAsRead,
    removeNotification,
    confettiPlay,
    finishConfetti,
    stopConfetti,
  } = useUserData();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDrawerClosing, setIsDrawerClosing] = useState(false);
  const drawerCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [notifPromptBusy, setNotifPromptBusy] = useState(false);
  /** 알림 권한 팝업이 끝난 뒤에만 매장 팝업 광고 표시 */
  const [allowPopupAds, setAllowPopupAds] = useState(false);


  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const readyOrders = activeOrders.filter((o) => o.status === "READY");

  // 헤더 구성 분기 처리
  const isMenuPage = pathname === "/user" || pathname === "/user/";
  const isCartPage = pathname === "/user/cart" || pathname === "/user/cart/";
  const isCheckoutPage = pathname === "/user/checkout" || pathname === "/user/checkout/";
  const isOrderHistoryPage = pathname === "/user/orders" || pathname === "/user/orders/";
  const isReviewPage = pathname === "/user/reviews" || pathname === "/user/reviews/";
  const isGuidePage = pathname === "/user/guide" || pathname === "/user/guide/";
  const isNoticesPage = pathname === "/user/notices" || pathname === "/user/notices/";
  const isContactPage = pathname === "/user/contact" || pathname === "/user/contact/";
  const isRefundPolicyPage =
    pathname === "/user/refund-policy" || pathname === "/user/refund-policy/";
  const isCompletePage = pathname.endsWith("/complete") || pathname.endsWith("/complete/");
  const isReceiptPage = pathname.endsWith("/receipt") || pathname.endsWith("/receipt/");
  const isStatusPage =
    pathname.includes("/orders/") && !isCompletePage && !isReceiptPage && !isOrderHistoryPage;
  /** OrderStatusPage(`/user/orders/:id`) + OrderCompletePage(`/user/orders/:id/complete`) */
  const isOrderReadyFlow = isStatusPage || isCompletePage;

  const prevPathRef = useRef<string | null>(null);
  const [pageSlideClass, setPageSlideClass] = useState("");

  // Confetti는 UserShell에 있어 현황→완료 전환 시에도 유지됨.
  // 주문 완료 플로우를 벗어나면 남은 duration을 기다리지 않고 즉시 종료.
  useEffect(() => {
    if (!confettiPlay) return;
    if (isOrderReadyFlow) return;
    stopConfetti();
  }, [confettiPlay, isOrderReadyFlow, stopConfetti]);

  useLayoutEffect(() => {
    const prev = prevPathRef.current;
    prevPathRef.current = pathname;

    const from = prev == null ? -1 : checkoutStackDepth(prev);
    const to = checkoutStackDepth(pathname);

    // 메뉴↔장바구니↔결제 스택 안에서만 전/후진 슬라이드
    if (from >= 0 && to >= 0 && from !== to) {
      setPageSlideClass(to > from ? "animate-page-from-right" : "animate-page-from-left");
      return;
    }

    // 그 외에서 장바구니/결제로 진입: 기존처럼 오른쪽에서
    if (to === 1 || to === 2) {
      setPageSlideClass("animate-page-from-right");
      return;
    }

    setPageSlideClass("");
  }, [pathname]);

  const openDrawer = () => {
    if (drawerCloseTimerRef.current) {
      clearTimeout(drawerCloseTimerRef.current);
      drawerCloseTimerRef.current = null;
    }
    setIsDrawerClosing(false);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (!isDrawerOpen || isDrawerClosing) return;
    setIsDrawerClosing(true);
    if (drawerCloseTimerRef.current) clearTimeout(drawerCloseTimerRef.current);
    drawerCloseTimerRef.current = setTimeout(() => {
      setIsDrawerOpen(false);
      setIsDrawerClosing(false);
      drawerCloseTimerRef.current = null;
    }, DRAWER_CLOSE_MS);
  };

  // 헤더 렌더링 여부
  const showHeader = true;

  // 헤더 타이틀 결정
  let headerTitle = "바비든든";
  if (isCartPage) headerTitle = "장바구니";
  if (isCheckoutPage) headerTitle = "결제하기";
  if (isOrderHistoryPage) headerTitle = "최근 주문 내역";
  if (isNoticesPage) headerTitle = "공지사항";
  if (isReviewPage) headerTitle = "리뷰";
  if (isGuidePage) headerTitle = "사용 가이드";
  if (isContactPage) headerTitle = "서비스 문의";
  if (isRefundPolicyPage) headerTitle = "환불 정책";
  if (isStatusPage || isCompletePage) headerTitle = "주문 현황";
  if (isReceiptPage) headerTitle = "전자영수증";

  // Escape 키 입력 시 패널 닫기 이벤트 핸들러
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setIsNotifOpen(false);
      setShowNotifPrompt(false);
      setIsDrawerOpen((open) => {
        if (!open) return open;
        setIsDrawerClosing(true);
        if (drawerCloseTimerRef.current) clearTimeout(drawerCloseTimerRef.current);
        drawerCloseTimerRef.current = setTimeout(() => {
          setIsDrawerOpen(false);
          setIsDrawerClosing(false);
          drawerCloseTimerRef.current = null;
        }, DRAWER_CLOSE_MS);
        return open;
      });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    return () => {
      if (drawerCloseTimerRef.current) clearTimeout(drawerCloseTimerRef.current);
    };
  }, []);

  // 1) 알림 권한 안내 → 2) 팝업 광고 → 3) 첫 화면
  useEffect(() => {
    if (typeof window === "undefined") {
      setAllowPopupAds(true);
      return;
    }

    if (!("Notification" in window)) {
      setAllowPopupAds(true);
      return;
    }

    if (Notification.permission === "granted") {
      void ensurePushSubscription();
      setAllowPopupAds(true);
      return;
    }

    if (Notification.permission !== "default") {
      setAllowPopupAds(true);
      return;
    }

    if (sessionStorage.getItem(NOTIF_PROMPT_SESSION_KEY) === "1") {
      setAllowPopupAds(true);
      return;
    }

    const timer = window.setTimeout(() => setShowNotifPrompt(true), 400);
    return () => window.clearTimeout(timer);
  }, []);

  const dismissNotifPrompt = () => {
    sessionStorage.setItem(NOTIF_PROMPT_SESSION_KEY, "1");
    setShowNotifPrompt(false);
    setAllowPopupAds(true);
  };

  const handleAllowNotifications = async () => {
    setNotifPromptBusy(true);
    try {
      const granted = await requestPermissionAndSubscribe();
      dismissNotifPrompt();
      if (!granted && Notification.permission === "denied") {
        alert("알림이 차단되었습니다. 브라우저 설정에서 허용으로 변경할 수 있습니다.");
      }
    } finally {
      setNotifPromptBusy(false);
    }
  };

  // 브라우저 권한 설정 요청 (드로어 수동)
  const handleRequestNotification = async () => {
    if (!("Notification" in window)) {
      alert("이 브라우저에서는 시스템 알림을 지원하지 않습니다.");
      return;
    }
    const granted = await requestPermissionAndSubscribe();
    if (granted) {
      alert("브라우저 알림 권한이 허용되었습니다. 준비 완료 시 푸시로 알려드립니다.");
    } else if (Notification.permission === "denied") {
      alert("브라우저 알림 권한이 거부되었습니다.");
    } else {
      alert("알림 권한을 허용해 주세요.");
    }
  };

  // 알림 클릭 핸들러 (개별 읽음 처리 후 리다이렉트)
  const handleNotifClick = (notifId: string, orderId: string, type: string) => {
    markAsRead(notifId);
    setIsNotifOpen(false);
    if (type === "READY") {
      navigate(`/user/orders/${orderId}/complete`);
    } else {
      navigate(`/user/orders/${orderId}`);
    }
  };

  return (
    <div
      className="flex items-center justify-center overflow-hidden bg-gray-50 py-0 sm:py-6"
      style={{ height: "var(--app-height)", maxHeight: "var(--app-height)" }}
    >
      {/* 430px 너비 제한 모바일 뷰 컨테이너 — confetti 발사 기준 프레임 */}
      <div
        id="user-app-frame"
        className="relative flex h-full w-full max-w-[430px] flex-col overflow-hidden border border-gray-100 bg-white sm:h-[min(850px,var(--app-height))] sm:rounded-3xl sm:shadow-lg"
      >
        {showHeader && (
          <UserHeader
            title={headerTitle}
            isMenuPage={isMenuPage}
            isStatusPage={isStatusPage}
            isCartPage={isCartPage}
            unreadCount={unreadCount}
            cartItemCount={totalCartItems}
            onOpenDrawer={() => {
              setIsNotifOpen(false);
              openDrawer();
            }}
            onToggleNotifications={() => setIsNotifOpen((prev) => !prev)}
            onBack={() => navigate(-1)}
            onHome={() => navigate("/user")}
            onMenuTitleClick={() => window.dispatchEvent(new Event("user-menu-scroll-top"))}
          />
        )}

        {/* 메인 콘텐츠 영역 — confetti는 pathname key 밖에 두어 페이지 전환 시에도 유지 */}
        <main className="flex-1 min-h-0 overflow-hidden bg-gray-50/30 flex flex-col relative">
          <ReadyConfetti
            active={!!confettiPlay}
            playKey={confettiPlay?.playKey}
            onDone={finishConfetti}
          />
          <div
            key={pathname}
            className={`flex min-h-0 flex-1 flex-col overflow-hidden ${pageSlideClass}`}
          >
            <Outlet />
          </div>
        </main>

        {/* 메뉴 첫 화면: 준비완료 상단 슬라이드 배너 */}
        <ReadyOrderBanner readyOrders={readyOrders} visible={isMenuPage} />

        {/* 메뉴 첫 화면: 매장 팝업 광고 (알림 권한 안내 이후) */}
        <UserPopupAd visible={isMenuPage && allowPopupAds} />

        <UserDrawer
          isOpen={isDrawerOpen}
          isClosing={isDrawerClosing}
          cartItemCount={totalCartItems}
          onClose={closeDrawer}
          onNavigate={(path) => {
            navigate(path);
            closeDrawer();
          }}
          onRequestNotification={() => {
            void handleRequestNotification();
            closeDrawer();
          }}
        />

        {isNotifOpen && (
          <NotificationPanel
            notifications={notifications}
            onClose={() => setIsNotifOpen(false)}
            onOpen={handleNotifClick}
            onMarkRead={markAsRead}
            onDelete={removeNotification}
          />
        )}
        {/* 3. 알림 권한 안내 팝업 (유저 페이지 첫 진입) */}
        {showNotifPrompt && (
          <div className="absolute inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/40 p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="notif-prompt-title"
              className="w-full max-w-[340px] rounded-2xl bg-white p-5 shadow-2xl animate-fade-in"
            >
              <h2 id="notif-prompt-title" className="text-base font-bold text-gray-900">
                준비 완료 알림
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-gray-500">
                주문이 준비되면 푸시 알림으로 알려드릴게요. 알림을 허용해 주세요.
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={dismissNotifPrompt}
                  disabled={notifPromptBusy}
                  className="flex-1 rounded-xl border border-gray-200 py-3 text-xs font-bold text-gray-600 cursor-pointer disabled:opacity-50"
                >
                  나중에
                </button>
                <button
                  type="button"
                  onClick={() => void handleAllowNotifications()}
                  disabled={notifPromptBusy}
                  className="flex-1 rounded-xl bg-black py-3 text-xs font-bold text-white cursor-pointer disabled:opacity-50"
                >
                  {notifPromptBusy ? "설정 중..." : "알림 허용"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserShell;
