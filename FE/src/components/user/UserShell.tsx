import React, { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useUserData } from "../../store/UserDataContext";
import {
  ensurePushSubscription,
  requestPermissionAndSubscribe,
} from "../../utils/webPush";
import ReadyOrderBanner from "./ReadyOrderBanner";
import SwipeableNotificationItem from "./SwipeableNotificationItem";
import UserPopupAd from "./UserPopupAd";

const NOTIF_PROMPT_SESSION_KEY = "babi_notif_prompt_shown";

export const UserShell: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { cart, notifications, activeOrders, markAsRead, removeNotification } = useUserData();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [notifPromptBusy, setNotifPromptBusy] = useState(false);
  const [popupAdOpen, setPopupAdOpen] = useState(false);

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const readyOrders = activeOrders.filter((o) => o.status === "READY");

  // 헤더 구성 분기 처리
  const isMenuPage = pathname === "/user" || pathname === "/user/";
  const isCartPage = pathname === "/user/cart" || pathname === "/user/cart/";
  const isCheckoutPage = pathname === "/user/checkout" || pathname === "/user/checkout/";
  const isOrderHistoryPage = pathname === "/user/orders" || pathname === "/user/orders/";
  const isReviewPage = pathname === "/user/reviews" || pathname === "/user/reviews/";
  const isCompletePage = pathname.endsWith("/complete") || pathname.endsWith("/complete/");
  const isStatusPage = pathname.includes("/orders/") && !isCompletePage && !isOrderHistoryPage;

  // 헤더 렌더링 여부
  const showHeader = true;

  // 헤더 타이틀 결정
  let headerTitle = "바비든든";
  if (isCartPage) headerTitle = "장바구니";
  if (isCheckoutPage) headerTitle = "결제하기";
  if (isOrderHistoryPage) headerTitle = "최근 주문 내역";
  if (isReviewPage) headerTitle = "리뷰";
  if (isStatusPage || isCompletePage) headerTitle = "주문 현황";

  // Escape 키 입력 시 패널 닫기 이벤트 핸들러
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsDrawerOpen(false);
        setIsNotifOpen(false);
        setShowNotifPrompt(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 유저 페이지 진입 시 알림 권한 안내 팝업 / 기존 허용 시 구독 보장
  // 매장 팝업 광고가 열려 있으면 겹치지 않도록 잠시 미룸
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    if (Notification.permission === "granted") {
      void ensurePushSubscription();
      return;
    }

    if (Notification.permission !== "default") return;
    if (sessionStorage.getItem(NOTIF_PROMPT_SESSION_KEY) === "1") return;
    if (popupAdOpen) return;

    // 첫 페인트 직후 팝업 (브라우저 제스처 요구는 버튼 클릭에서 충족)
    const timer = window.setTimeout(() => setShowNotifPrompt(true), 400);
    return () => window.clearTimeout(timer);
  }, [popupAdOpen]);

  const dismissNotifPrompt = () => {
    sessionStorage.setItem(NOTIF_PROMPT_SESSION_KEY, "1");
    setShowNotifPrompt(false);
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
      {/* 430px 너비 제한 모바일 뷰 컨테이너 */}
      <div className="relative flex h-full w-full max-w-[430px] flex-col overflow-hidden border border-gray-100 bg-white sm:h-[min(850px,var(--app-height))] sm:rounded-3xl sm:shadow-lg">
        {showHeader && (
          <header className="h-14 border-b border-gray-100 flex items-center justify-between px-4 sticky top-0 bg-white z-50 shrink-0">
            {/* 왼쪽 영역 */}
            <div className="w-10 flex items-center">
              {isMenuPage ? (
                // 햄버거 메뉴 아이콘
                <button
                  onClick={() => {
                    setIsNotifOpen(false);
                    setIsDrawerOpen(true);
                  }}
                  className="text-gray-700 focus:outline-none p-1 cursor-pointer"
                  aria-label="메뉴"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              ) : (
                // 뒤로가기 버튼
                <button
                  onClick={() => navigate(-1)}
                  className="text-gray-700 focus:outline-none p-1 cursor-pointer"
                  aria-label="뒤로가기"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
            </div>

            {/* 타이틀 — 메뉴 페이지의 바비든든 클릭 시 목록 스크롤 최상단 */}
            {isMenuPage ? (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event("user-menu-scroll-top"))}
                className="flex-1 text-center text-lg font-bold text-gray-800 focus:outline-none cursor-pointer"
                aria-label="메뉴 맨 위로"
              >
                {headerTitle}
              </button>
            ) : (
              <h1 className="text-lg font-bold text-gray-800 text-center flex-1">{headerTitle}</h1>
            )}

            {/* 오른쪽 영역 */}
            <div className="w-10 flex items-center justify-end">
              {isMenuPage && (
                // 알림 종 아이콘
                <button
                  onClick={() => setIsNotifOpen((prev) => !prev)}
                  className="text-gray-700 relative p-1 focus:outline-none cursor-pointer"
                  aria-label="알림"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                    />
                  </svg>
                  {/* 빨간 알림 뱃지 */}
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">
                      {unreadCount}
                    </span>
                  )}
                </button>
              )}

              {isStatusPage && (
                // 홈으로 가기 버튼
                <button
                  onClick={() => navigate("/user")}
                  className="text-gray-700 focus:outline-none p-1 cursor-pointer"
                  aria-label="홈"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                </button>
              )}

              {isCartPage && totalCartItems > 0 && (
                <div className="w-6 h-6"></div>
              )}
            </div>
          </header>
        )}

        {/* 메인 콘텐츠 영역 */}
        <main className="flex-1 min-h-0 overflow-hidden bg-gray-50/30 flex flex-col relative">
          <Outlet />
        </main>

        {/* 메뉴 첫 화면: 준비완료 상단 슬라이드 배너 */}
        <ReadyOrderBanner readyOrders={readyOrders} visible={isMenuPage} />

        {/* 메뉴 첫 화면: 매장 팝업 광고 */}
        <UserPopupAd visible={isMenuPage} onOpenChange={setPopupAdOpen} />

        {/* 1. 사이드 메뉴 드로어 오버레이 및 패널 */}
        {isDrawerOpen && (
          <div className="absolute inset-0 z-50 flex">
            {/* 오버레이 클릭 시 닫기 */}
            <div
              className="absolute inset-0 bg-black/40 transition-opacity"
              onClick={() => setIsDrawerOpen(false)}
            ></div>

            {/* 단순한 흰색 패널 */}
            <aside className="absolute inset-y-0 left-0 bg-white w-64 shadow-2xl flex flex-col p-5 z-50 animate-slide-right border-r border-gray-100">
              <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <span className="text-base font-extrabold text-gray-900 tracking-wide">바비든든</span>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none p-1 cursor-pointer"
                  aria-label="메뉴 닫기"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <nav className="flex-1 py-4 space-y-2">
                <button
                  onClick={() => {
                    navigate("/user");
                    setIsDrawerOpen(false);
                  }}
                  className="w-full text-left py-3 px-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  메뉴 보기
                </button>
                <button
                  onClick={() => {
                    navigate("/user/cart");
                    setIsDrawerOpen(false);
                  }}
                  className="w-full text-left py-3 px-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  장바구니
                  {totalCartItems > 0 && (
                    <span className="ml-2 text-[10px] font-bold text-[#C59B62]">{totalCartItems}</span>
                  )}
                </button>
                <button
                  onClick={() => {
                    navigate("/user/orders");
                    setIsDrawerOpen(false);
                  }}
                  className="w-full text-left py-3 px-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  최근 주문 내역
                </button>
                <button
                  onClick={() => {
                    navigate("/user/reviews");
                    setIsDrawerOpen(false);
                  }}
                  className="w-full text-left py-3 px-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  리뷰
                </button>
                <button
                  onClick={() => {
                    handleRequestNotification();
                    setIsDrawerOpen(false);
                  }}
                  className="w-full text-left py-3 px-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer border-t border-gray-100 mt-4 pt-4"
                >
                  브라우저 알림 설정
                </button>
              </nav>
            </aside>
          </div>
        )}

        {/* 2. 앱 내부 알림 팝오버 패널 */}
        {isNotifOpen && (
          <>
            {/* 오버레이 클릭 시 닫히도록 바깥 백드롭 영역 지정 */}
            <div className="absolute inset-0 z-40 bg-transparent" onClick={() => setIsNotifOpen(false)}></div>
            <div className="absolute top-14 right-4 bg-white border border-gray-100 rounded-2xl w-[320px] max-h-[350px] shadow-xl z-50 flex flex-col p-4 overflow-y-auto animate-fade-in space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-xs font-bold text-gray-800">알림</span>
                <button
                  onClick={() => setIsNotifOpen(false)}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none text-[10px] font-bold"
                >
                  닫기
                </button>
              </div>

              {notifications.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-[10px] font-semibold">
                  새로운 알림이 없습니다.
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[9px] font-medium text-gray-400 px-0.5">
                    ← 삭제 · 읽음 →
                  </p>
                  {notifications.map((notif) => (
                    <SwipeableNotificationItem
                      key={notif.id}
                      notif={notif}
                      onOpen={() => handleNotifClick(notif.id, notif.orderId, notif.type)}
                      onMarkRead={() => markAsRead(notif.id)}
                      onDelete={() => removeNotification(notif.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
        {/* 3. 알림 권한 안내 팝업 (유저 페이지 첫 진입) */}
        {showNotifPrompt && (
          <div className="absolute inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 p-4">
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
