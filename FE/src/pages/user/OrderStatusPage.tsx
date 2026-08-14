import React, { useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUserData } from "../../store/UserDataContext";
import { formatSelectedOptions } from "../../utils/formatSelectedOptions";
import { linkPushSubscriptionToOrder } from "../../utils/webPush";
import { claimReadyCall, claimReadyConfetti } from "../../utils/readyCall";
import type { OrderStatus } from "../../types/user";

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

  let statusMessage = "주문이 접수되었습니다. 잠시만 기다려 주세요!";
  let stepIndex = 0;
  const isCanceled = order.status === "CANCELED";

  if (isCanceled) {
    statusMessage = "주문이 취소되었습니다.";
    stepIndex = -1;
  } else if (order.status === "PREPARING") {
    statusMessage = "맛있게 조리 중입니다. 잠시만 기다려 주세요!";
    stepIndex = 1;
  } else if (order.status === "READY" || order.status === "COMPLETED") {
    statusMessage = "음식이 준비되었습니다. 카운터에서 픽업해주세요!";
    stepIndex = 2;
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50/30 pb-6 overflow-y-auto">
      {/* 대기번호 / 안내 문구 — 기존 1블록 (p-6) */}
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
      </div>

      {/* 진행 단계 — 기존 mt-6 / mx-4 / p-5 / space-y-6 */}
      <div className="mt-6 mx-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100 shrink-0">
        <div className="space-y-6 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-100">
          {[
            { title: "주문 접수", desc: "주문이 정상적으로 전달되었습니다." },
            { title: "조리 중", desc: "사장님이 음식을 준비하고 있습니다." },
            { title: "픽업 가능", desc: "카운터에서 픽업번호를 말씀해주세요." },
          ].map((step, idx) => {
            const isDone = !isCanceled && stepIndex > idx;
            const isCurrent = !isCanceled && stepIndex === idx;
            return (
              <div key={idx} className="flex gap-4 relative z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-4 border-white shadow-sm ${
                    isDone || isCurrent ? "bg-black text-white" : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {isDone ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <span className="text-[10px] font-bold">{idx + 1}</span>
                  )}
                </div>
                <div className="pt-1">
                  <h4
                    className={`text-xs font-bold ${
                      isDone || isCurrent ? "text-gray-900" : "text-gray-400"
                    }`}
                  >
                    {step.title}
                  </h4>
                  <p
                    className={`text-[11px] mt-0.5 ${
                      isDone || isCurrent ? "text-gray-500" : "text-gray-300"
                    }`}
                  >
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 대기 인원 / 예상시간 — 기존 mt-4 / mx-4 / p-4 */}
      {!isCanceled && (
        <div className="mt-4 mx-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 shrink-0">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-gray-700">내 앞 대기</span>
            <span className="text-xs font-black text-gray-900">
              {order.status === "READY" || order.status === "COMPLETED"
                ? "없음"
                : order.waitingCount > 0
                  ? `${order.waitingCount}명`
                  : "없음"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-gray-700">예상 대기시간</span>
            <span className="text-xs font-black text-gray-900">
              {order.status === "READY" || order.status === "COMPLETED"
                ? "곧 호출"
                : `약 ${order.waitingCount > 0 ? order.waitingTime : 1}분`}
            </span>
          </div>
        </div>
      )}

      {/* 주문 상세 — 기존 mt-4 / mx-4 */}
      <div className="mt-4 mx-4 bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 shrink-0">
        <div className="px-4 py-3 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-bold text-gray-800 text-xs">주문 상세</h3>
          <span className="text-[10px] text-gray-400 font-medium">
            {order.createdAt.includes(" ")
              ? order.createdAt.split(" ")[1]
              : order.createdAt}
          </span>
        </div>
        <div className="p-4 space-y-4">
          {order.items.map((item) => {
            const optionString = formatSelectedOptions(item.selectedOptions);
            return (
              <div key={item.cartItemId} className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-bold text-gray-900 text-xs">{item.menuName}</span>
                    <span className="text-[10px] font-bold text-gray-400">x{item.quantity}</span>
                  </div>
                  {optionString && (
                    <p className="text-[10px] text-gray-400 font-medium leading-snug">{optionString}</p>
                  )}
                </div>
                <span className="font-bold text-gray-700 text-xs shrink-0">
                  {item.totalPrice.toLocaleString()}원
                </span>
              </div>
            );
          })}
        </div>
        <div className="px-4 py-4 bg-gray-50 flex justify-between items-center">
          <span className="font-bold text-gray-500 text-xs">총 결제금액</span>
          <span className="font-black text-gray-900 text-sm">
            {order.totalPrice.toLocaleString()}원
          </span>
        </div>
      </div>

      {!isCanceled && (order.status === "READY" || order.status === "COMPLETED") && (
        <div className="mt-4 mx-4 shrink-0">
          <button
            type="button"
            onClick={() => navigate(`/user/orders/${order.orderId}/receipt`)}
            className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white py-3.5 text-xs font-bold text-gray-800 shadow-sm"
          >
            전자영수증
          </button>
        </div>
      )}
    </div>
  );
};

export default OrderStatusPage;
