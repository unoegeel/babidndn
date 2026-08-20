import React, { useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUserData } from "../../store/UserDataContext";
import { formatSelectedOptions } from "../../utils/formatSelectedOptions";
import { linkPushSubscriptionToOrder } from "../../utils/webPush";
import { claimReadyCall, claimReadyConfetti } from "../../utils/readyCall";
import type { OrderStatus } from "../../types/user";
import { trackOrderStatusView } from "../../utils/userEvent/eventHelpers";

export const OrderStatusPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { getOrderById, readyCallSignal, startConfetti } = useUserData();

  const order = orderId ? getOrderById(orderId) : null;

  const navigateRef = useRef(navigate);
  const startConfettiRef = useRef(startConfetti);
  /** null = 아직 Context 상태를 한 번도 관측하지 않음 (이미 READY인 진입은 confetti 금지) */
  const prevStatusRef = useRef<OrderStatus | null>(null);
  const readyConfettiFiredRef = useRef(false);
  /** Strict Mode 리마운트 시 세션 초기화 중복 방지 */
  const pollSessionRef = useRef<string | null>(null);
  /** READY/COMPLETED 네비게이션 중복 방지 */
  const navigatedToCompleteRef = useRef(false);

  useEffect(() => {
    navigateRef.current = navigate;
    startConfettiRef.current = startConfetti;
  });

  // 재호출 시그널 — 현황 화면에 남아 있는 동안 Confetti 재실행
  useEffect(() => {
    if (!orderId || !readyCallSignal?.isRecall) return;
    if (readyCallSignal.orderId !== orderId) return;
    if (!claimReadyConfetti(orderId, readyCallSignal.updatedAt)) return;
    startConfettiRef.current(readyCallSignal.updatedAt);
  }, [readyCallSignal, orderId]);

  useEffect(() => {
    if (!orderId) {
      alert("주문 정보를 찾을 수 없습니다.");
      navigateRef.current("/user", { replace: true });
      return;
    }

    const isNewSession = pollSessionRef.current !== orderId;
    if (isNewSession) {
      pollSessionRef.current = orderId;
      prevStatusRef.current = null;
      readyConfettiFiredRef.current = false;
      navigatedToCompleteRef.current = false;
    }

    void linkPushSubscriptionToOrder(orderId);
  }, [orderId]);

  const noteReadyTransition = useCallback((nextStatus: OrderStatus): boolean => {
    const prev = prevStatusRef.current;
    const isReadyLike = nextStatus === "READY" || nextStatus === "COMPLETED";
    let shouldCelebrate = false;

    if (prev !== null && prev !== "READY" && prev !== "COMPLETED" && isReadyLike) {
      if (!readyConfettiFiredRef.current) {
        readyConfettiFiredRef.current = true;
        shouldCelebrate = true;
      }
    } else if (prev !== null && !isReadyLike && (prev === "READY" || prev === "COMPLETED")) {
      readyConfettiFiredRef.current = false;
    }

    prevStatusRef.current = nextStatus;
    return shouldCelebrate;
  }, []);

  useEffect(() => {
    if (orderId && order) {
      trackOrderStatusView(orderId, order.status);
    }
  }, [orderId, order?.status]);

  // Context 주문 갱신 → READY UX (알림은 Context polling이 담당)
  useEffect(() => {
    if (!orderId || !order) return;

    const shouldCelebrate = noteReadyTransition(order.status);
    if (shouldCelebrate) {
      let canShow = true;
      if (order.updatedAt) {
        claimReadyCall(orderId, order.updatedAt);
        canShow = claimReadyConfetti(orderId, order.updatedAt);
      }
      if (canShow) {
        const playKey = order.updatedAt || `${orderId}-ready`;
        startConfettiRef.current(playKey);
      }
    }

    if (
      (order.status === "READY" || order.status === "COMPLETED") &&
      !navigatedToCompleteRef.current
    ) {
      navigatedToCompleteRef.current = true;
      navigateRef.current(`/user/orders/${orderId}/complete`, { replace: true });
    }
  }, [order, orderId, noteReadyTransition]);

  if (!orderId) {
    return null;
  }

  if (!order) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white text-center">
        <p className="text-gray-800 font-bold text-xs mb-4">주문 정보를 찾을 수 없습니다.</p>
        <button
          onClick={() => navigate("/user", { replace: true })}
          className="bg-black text-white py-2.5 px-5 rounded-xl font-bold text-xs cursor-pointer"
        >
          메뉴판으로 돌아가기
        </button>
      </div>
    );
  }

  const isCanceled = order.status === "CANCELED";
  const isReadyLike = order.status === "READY" || order.status === "COMPLETED";
  const statusMessage = isCanceled
    ? "주문이 취소되었습니다."
    : isReadyLike
      ? "음식을 픽업해주세요."
      : "맛있게 조리 중입니다. 잠시만 기다려 주세요!";
  const waitingAheadLabel = isReadyLike
    ? "없음"
    : order.waitingCount > 0
      ? `${order.waitingCount}명`
      : "없음";
  const waitingTimeLabel = isReadyLike
    ? "조리 완료"
    : `약 ${order.waitingCount > 0 ? order.waitingTime : 1}분`;

  const progressSteps = [
    { title: "주문 완료", active: !isCanceled },
    { title: "조리 중", active: !isCanceled },
    { title: "준비 완료", active: !isCanceled && isReadyLike },
  ];

  return (
    <div className="relative flex-1 flex flex-col bg-gray-50/30 overflow-hidden h-full">
      <div className="flex-1 overflow-y-auto pb-6">
        <div className="bg-white border-b border-gray-100 p-6 text-center space-y-2 shrink-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">내 대기번호</p>
          <h2
            className={`text-6xl font-extrabold leading-[1.05] tracking-tight ${
              isCanceled ? "text-gray-300 line-through" : "text-gray-900"
            }`}
          >
            {order.pickupNumber}
          </h2>
          <p
            className={`min-h-[2.5rem] text-xs font-semibold leading-snug ${
              isCanceled ? "text-red-500" : "text-gray-700"
            }`}
          >
            {statusMessage}
          </p>
          {order.status === "PREPARING" && (
            <p className="text-[11px] font-medium text-gray-500 leading-snug">
              15분 이내에 수령하지 않을 경우, 음식은 폐기될 수 있습니다.
            </p>
          )}
        </div>

        <div className="bg-white border-y border-gray-100 p-6 flex justify-around items-center relative shrink-0">
          {isCanceled ? (
            <div className="absolute left-[16%] right-[16%] top-[38%] z-0 h-[3px] bg-gray-100"></div>
          ) : isReadyLike ? (
            <div className="absolute left-[16%] right-[16%] top-[38%] z-0 h-[3px] bg-[#009E39]"></div>
          ) : (
            <div className="absolute left-[16%] right-[16%] top-[38%] z-0 flex h-[3px]">
              <div className="h-full flex-1 bg-[#009E39]"></div>
              <div className="h-full flex-1 bg-gray-200"></div>
            </div>
          )}

          {progressSteps.map((step) => {
            const isPreparingCooking =
              !isCanceled && !isReadyLike && step.title === "조리 중";
            return (
              <div key={step.title} className="z-10 flex shrink-0 flex-col items-center">
                <div
                  className={`flex h-6.5 w-6.5 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 text-[10px] font-bold ${
                    step.active
                      ? "border-[#009E39] bg-[#009E39] text-white"
                      : "border-gray-200 bg-white text-gray-300"
                  }`}
                >
                  {isPreparingCooking ? (
                    <span
                      className="block h-2 w-2 rounded-full bg-white animate-preparing-ripple"
                      aria-hidden
                    />
                  ) : step.active ? (
                    "✓"
                  ) : (
                    ""
                  )}
                </div>
                <span
                  className={`mt-2 whitespace-nowrap text-[11px] font-semibold ${
                    step.active ? "text-[#009E39]" : "text-gray-300"
                  }`}
                >
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>

        {!isCanceled && (
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm">
                <span className="text-[11px] font-medium text-gray-400 block mb-1 leading-snug">
                  내 앞 대기
                </span>
                <span className="text-xl font-bold text-gray-800 leading-[1.1]">
                  {waitingAheadLabel}
                </span>
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm">
                <span className="text-[11px] font-medium text-gray-400 block mb-1 leading-snug">
                  대기 시간
                </span>
                <span className="text-xl font-bold text-gray-800 leading-[1.1]">
                  {waitingTimeLabel}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="px-4 space-y-3">
          <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3 shadow-sm text-[11px]">
            <div className="flex justify-between items-center text-gray-500 font-medium">
              <span>주문 시간</span>
              <span className="font-semibold text-gray-800">{order.createdAt}</span>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3.5 shadow-sm">
            <h3 className="text-xs font-bold text-gray-900 border-b border-gray-100 pb-2">주문 내역</h3>
            <div className="space-y-3.5 pl-1.5">
              {order.items.map((item) => {
                const optionString = formatSelectedOptions(item.selectedOptions);
                return (
                  <div key={item.cartItemId} className="text-xs space-y-0.5">
                    <div className="flex items-center justify-between gap-2 text-gray-800 font-bold">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span>•</span>
                        <span className="truncate">{item.menuName}</span>
                      </div>
                      <span className="shrink-0 tabular-nums">
                        {item.totalPrice.toLocaleString()}원
                      </span>
                    </div>
                    {optionString && (
                      <p className="text-[11px] text-gray-400 pl-3 leading-normal font-medium">
                        {optionString}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {!isCanceled && (
            <button
              type="button"
              onClick={() => navigate(`/user/orders/${order.orderId}/receipt`)}
              className="w-full cursor-pointer rounded-2xl border border-gray-200 bg-white py-3.5 text-xs font-bold text-gray-800 shadow-sm"
            >
              전자영수증
            </button>
          )}
        </div>
      </div>

      {/* 하단 안내 */}
      <div
        className="shrink-0 px-4 py-3 bg-white border-t border-gray-100 z-40"
        style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}
      >
        <div className="text-center text-gray-400">
          <p className="text-[11px] font-medium leading-snug">※ 실시간으로 업데이트됩니다.</p>
        </div>
      </div>
    </div>
  );
};

export default OrderStatusPage;
