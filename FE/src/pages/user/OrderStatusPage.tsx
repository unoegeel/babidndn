import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUserData } from "../../store/UserDataContext";
import { orderService, mapOrderDetailToOrder } from "../../services/user/orderService";
import { formatSelectedOptions } from "../../utils/formatSelectedOptions";
import { linkPushSubscriptionToOrder } from "../../utils/webPush";
import ReadyConfetti from "../../components/user/ReadyConfetti";
import { claimReadyCall, claimReadyConfetti } from "../../utils/readyCall";
import type { Order, OrderStatus } from "../../types/user";

/** READY 전환 confetti를 주문 현황 화면에서 볼 수 있도록, 완료 페이지 이동만 짧게 보류 */
const READY_CONFETTI_HOLD_MS = 2800;

export const OrderStatusPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { getOrderById, saveOrderToState, addNotification, readyCallSignal } = useUserData();

  const [order, setOrder] = useState<Order | null>(() => (orderId ? getOrderById(orderId) : null));
  const [loading, setLoading] = useState<boolean>(!order);
  const [error, setError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // 최신 콜백 및 네비게이트 함수를 Ref로 유지하여 useEffect 재실행 차단
  const saveOrderToStateRef = useRef(saveOrderToState);
  const addNotificationRef = useRef(addNotification);
  const navigateRef = useRef(navigate);
  /** null = 아직 서버/폴링 상태를 한 번도 받지 않음 (이미 READY인 진입은 confetti 금지) */
  const prevStatusRef = useRef<OrderStatus | null>(null);
  const readyConfettiFiredRef = useRef(false);
  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRecallConfettiAtRef = useRef<string | null>(null);

  useEffect(() => {
    saveOrderToStateRef.current = saveOrderToState;
    addNotificationRef.current = addNotification;
    navigateRef.current = navigate;
  });

  // 재호출 시그널 (컨텍스트 폴링) — 현황 화면에 남아 있는 동안 Confetti 재실행
  useEffect(() => {
    if (!orderId || !readyCallSignal?.isRecall) return;
    if (readyCallSignal.orderId !== orderId) return;
    if (!claimReadyConfetti(orderId, readyCallSignal.updatedAt)) return;
    lastRecallConfettiAtRef.current = readyCallSignal.updatedAt;
    setShowConfetti(true);
  }, [readyCallSignal, orderId]);

  // 알림 중복 발송 방지용 Ref
  const alertSentRef = useRef<{ preparing: boolean; ready: boolean; canceled: boolean }>({
    preparing: false,
    ready: false,
    canceled: false,
  });

  // 주문 상세 Polling (2초 간격)
  useEffect(() => {
    if (!orderId) {
      alert("주문 정보를 찾을 수 없습니다.");
      navigateRef.current("/user", { replace: true });
      return;
    }

    // 주문마다 알림 플래그 초기화 (이전 주문 상태가 새 주문을 막지 않도록)
    alertSentRef.current = { preparing: false, ready: false, canceled: false };
    prevStatusRef.current = null;
    readyConfettiFiredRef.current = false;
    setShowConfetti(false);
    if (navigateTimerRef.current) {
      clearTimeout(navigateTimerRef.current);
      navigateTimerRef.current = null;
    }

    // 준비완료 Web Push 대상 주문으로 현재 구독 연결 (다중 주문 누적)
    void linkPushSubscriptionToOrder(orderId);

    let isMounted = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const isFetchingRef = { current: false };

    /** READY(또는 COMPLETED)로 막 전환된 최초 순간에만 true */
    const noteReadyTransition = (nextStatus: OrderStatus): boolean => {
      const prev = prevStatusRef.current;
      const isReadyLike = nextStatus === "READY" || nextStatus === "COMPLETED";
      let shouldCelebrate = false;

      if (prev !== null && prev !== "READY" && prev !== "COMPLETED" && isReadyLike) {
        if (!readyConfettiFiredRef.current) {
          readyConfettiFiredRef.current = true;
          shouldCelebrate = true;
        }
      } else if (prev !== null && !isReadyLike && (prev === "READY" || prev === "COMPLETED")) {
        // READY를 벗어난 뒤 다시 READY가 되면 재실행 가능
        readyConfettiFiredRef.current = false;
      }

      prevStatusRef.current = nextStatus;
      return shouldCelebrate;
    };

    const goToComplete = () => {
      navigateRef.current(`/user/orders/${orderId}/complete`, { replace: true });
    };

    const fetchOrderDetails = async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        const res = await orderService.getOrder(orderId);
        if (!isMounted) return;

        const updatedOrder = mapOrderDetailToOrder(res);
        const shouldCelebrate = noteReadyTransition(updatedOrder.status);
        if (shouldCelebrate) {
          if (updatedOrder.updatedAt) {
            claimReadyCall(orderId, updatedOrder.updatedAt);
            claimReadyConfetti(orderId, updatedOrder.updatedAt);
          }
          setShowConfetti(true);
        }
        setOrder(updatedOrder);
        saveOrderToStateRef.current(updatedOrder);
        setLoading(false);

        if (updatedOrder.status === "PREPARING" && !alertSentRef.current.preparing) {
          addNotificationRef.current(
            "PREPARING",
            "조리 시작",
            `${updatedOrder.pickupNumber}번 주문을 조리하고 있습니다.`,
            updatedOrder.orderId
          );
          alertSentRef.current.preparing = true;
        }

        if (updatedOrder.status === "READY" || updatedOrder.status === "COMPLETED") {
          if (!alertSentRef.current.ready) {
            addNotificationRef.current(
              "READY",
              "준비 완료",
              `${updatedOrder.pickupNumber}번 주문이 준비되었습니다. 카운터에서 픽업해 주세요.`,
              updatedOrder.orderId
            );
            alertSentRef.current.ready = true;

            // Web Push는 서버(호출→READY)에서 발송. 포그라운드 폴링 중복 시스템 알림은 생략합니다.
          }

          if (intervalId) clearInterval(intervalId);

          // confetti를 주문 현황에서 보여 준 뒤에만 완료 페이지로 이동 (기존 진입·새로고침은 즉시 이동)
          if (shouldCelebrate) {
            if (!navigateTimerRef.current) {
              navigateTimerRef.current = setTimeout(() => {
                navigateTimerRef.current = null;
                goToComplete();
              }, READY_CONFETTI_HOLD_MS);
            }
          } else if (!navigateTimerRef.current) {
            goToComplete();
          }
          return;
        }

        if (updatedOrder.status === "CANCELED") {
          if (!alertSentRef.current.canceled) {
            addNotificationRef.current(
              "CANCELED",
              "주문 취소",
              `${updatedOrder.pickupNumber}번 주문이 취소되었습니다.`,
              updatedOrder.orderId
            );
            alertSentRef.current.canceled = true;
          }
          if (intervalId) clearInterval(intervalId);
          return;
        }
      } catch (err: unknown) {
        console.error("주문 정보 조회 실패:", err);
        if (isMounted) {
          const message = err instanceof Error ? err.message : "주문 정보를 불러오지 못했습니다.";
          setError(message);
          setLoading(false);
        }
      } finally {
        isFetchingRef.current = false;
      }
    };

    fetchOrderDetails();
    intervalId = setInterval(fetchOrderDetails, 2000);

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
      if (navigateTimerRef.current) {
        clearTimeout(navigateTimerRef.current);
        navigateTimerRef.current = null;
      }
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <p className="text-gray-500 font-semibold text-xs">주문 상태 정보를 조회하고 있습니다...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white text-center">
        <p className="text-gray-800 font-bold text-xs mb-4">{error || "주문 정보를 찾을 수 없습니다."}</p>
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
    <div className="relative flex-1 flex flex-col bg-gray-50/30 pb-6 overflow-y-auto">
      <ReadyConfetti active={showConfetti} onDone={() => setShowConfetti(false)} />

      <div className="bg-white border-b border-gray-100 p-6 text-center space-y-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">내 대기번호</p>
        <h2
          className={`text-6xl font-extrabold leading-[1.05] tracking-tight ${
            isCanceled ? "text-gray-300 line-through" : "text-gray-900"
          }`}
        >
          {order.pickupNumber}
        </h2>
        <p className={`text-xs font-semibold mt-2 leading-snug ${isCanceled ? "text-red-500" : "text-gray-700"}`}>
          {statusMessage}
        </p>
      </div>

      {isCanceled ? (
        <div className="p-4">
          <div className="space-y-2 rounded-2xl border border-red-100 bg-red-50 p-5 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-red-600">결제가 취소되었습니다</h3>
            <p className="text-[11px] font-semibold leading-relaxed text-red-500/80">
              매장에서 주문을 취소했습니다.
              <br />
              문의사항은 카운터에 말씀해 주세요.
            </p>
            <button
              type="button"
              onClick={() => navigate("/user", { replace: true })}
              className="mt-2 cursor-pointer rounded-xl bg-black px-5 py-2.5 text-xs font-bold text-white"
            >
              메뉴판으로 돌아가기
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white border-y border-gray-100 p-6 flex justify-around items-center relative">
            <div className="absolute left-[16%] right-[16%] top-[38%] h-[3px] bg-gray-200 z-0"></div>
            <div
              className="absolute left-[16%] top-[38%] h-[3px] bg-[#009E39] z-0 transition-all duration-700"
              style={{ width: stepIndex === 0 ? "0%" : stepIndex === 1 ? "34%" : "68%" }}
            ></div>

            <div className="flex flex-col items-center z-10">
              <div
                className={`w-6.5 h-6.5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                  stepIndex >= 0
                    ? "bg-[#009E39] border-[#009E39] text-white"
                    : "bg-white border-gray-300 text-gray-400"
                }`}
              >
                ✓
              </div>
              <span className={`text-[11px] font-semibold mt-2 ${stepIndex >= 0 ? "text-[#009E39]" : "text-gray-400"}`}>
                주문 완료
              </span>
            </div>

            <div className="flex flex-col items-center z-10">
              <div
                className={`w-6.5 h-6.5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                  stepIndex >= 1
                    ? "bg-[#009E39] border-[#009E39] text-white"
                    : "bg-white border-gray-300 text-gray-400"
                }`}
              >
                {stepIndex === 1 ? (
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
                ) : stepIndex > 1 ? (
                  "✓"
                ) : (
                  "2"
                )}
              </div>
              <span className={`text-[11px] font-semibold mt-2 ${stepIndex >= 1 ? "text-[#009E39]" : "text-gray-400"}`}>
                조리 중
              </span>
            </div>

            <div className="flex flex-col items-center z-10">
              <div
                className={`w-6.5 h-6.5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                  stepIndex >= 2
                    ? "bg-[#009E39] border-[#009E39] text-white"
                    : "bg-white border-gray-300 text-gray-400"
                }`}
              >
                {stepIndex >= 2 ? "✓" : null}
              </div>
              <span className={`text-[11px] font-semibold mt-2 ${stepIndex >= 2 ? "text-[#009E39]" : "text-gray-400"}`}>
                준비 완료
              </span>
            </div>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm">
                <span className="text-[11px] font-medium text-gray-400 block mb-1 leading-snug">내 앞 대기</span>
                <span className="text-xl font-bold text-gray-800 leading-[1.1]">
                  {order.waitingCount > 0 ? `${order.waitingCount}명` : "없음"}
                </span>
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm">
                <span className="text-[11px] font-medium text-gray-400 block mb-1 leading-snug">예상 대기 시간</span>
                <span className="text-xl font-bold text-gray-800 leading-[1.1]">
                  {order.status === "READY" || order.status === "COMPLETED"
                    ? "조리 완료"
                    : `약 ${order.waitingCount > 0 ? order.waitingTime : 1}분`}
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="px-4 space-y-3">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3 shadow-sm text-[11px]">
          <div className="flex justify-between items-center text-gray-500 font-semibold">
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
      </div>

      {!isCanceled && (
        <div className="text-center py-5 text-gray-400">
          <p className="text-[11px] font-medium leading-snug">※ 실시간으로 업데이트됩니다.</p>
        </div>
      )}
    </div>
  );
};

export default OrderStatusPage;
