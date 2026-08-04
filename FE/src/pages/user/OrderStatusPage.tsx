import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUserData } from "../../store/UserDataContext";
import { orderService, mapOrderDetailToOrder } from "../../services/user/orderService";
import type { MenuOption, Order } from "../../types/user";

export const OrderStatusPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { getOrderById, saveOrderToState, addNotification } = useUserData();

  const [order, setOrder] = useState<Order | null>(() => (orderId ? getOrderById(orderId) : null));
  const [loading, setLoading] = useState<boolean>(!order);
  const [error, setError] = useState<string | null>(null);

  // 최신 콜백 및 네비게이트 함수를 Ref로 유지하여 useEffect 재실행 차단
  const saveOrderToStateRef = useRef(saveOrderToState);
  const addNotificationRef = useRef(addNotification);
  const navigateRef = useRef(navigate);

  useEffect(() => {
    saveOrderToStateRef.current = saveOrderToState;
    addNotificationRef.current = addNotification;
    navigateRef.current = navigate;
  });

  // 알림 중복 발송 방지용 Ref
  const alertSentRef = useRef<{ preparing: boolean; ready: boolean }>({
    preparing: false,
    ready: false,
  });

  // 주문 상세 Polling (3초 간격 setInterval)
  useEffect(() => {
    if (!orderId) {
      alert("주문 정보를 찾을 수 없습니다.");
      navigateRef.current("/user", { replace: true });
      return;
    }

    let isMounted = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const isFetchingRef = { current: false };

    const fetchOrderDetails = async () => {
      // 이전 요청이 진행 중이면 중복 요청 차단
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        const res = await orderService.getOrder(orderId);
        if (!isMounted) return;

        const updatedOrder = mapOrderDetailToOrder(res);
        setOrder(updatedOrder);
        saveOrderToStateRef.current(updatedOrder);
        setLoading(false);

        // 조리 시작 알림 (PREPARING)
        if (updatedOrder.status === "PREPARING" && !alertSentRef.current.preparing) {
          addNotificationRef.current(
            "PREPARING",
            "조리 시작",
            `${updatedOrder.pickupNumber}번 주문을 조리하고 있습니다.`,
            updatedOrder.orderId
          );
          alertSentRef.current.preparing = true;
        }

        // 준비 완료 (READY 또는 COMPLETED) 시 알림 및 이동 & Polling 중단
        if (updatedOrder.status === "READY" || updatedOrder.status === "COMPLETED") {
          if (!alertSentRef.current.ready) {
            addNotificationRef.current(
              "READY",
              "준비 완료",
              `${updatedOrder.pickupNumber}번 주문이 준비되었습니다. 카운터에서 픽업해 주세요.`,
              updatedOrder.orderId
            );
            alertSentRef.current.ready = true;

            // 데스크톱 브라우저 알림
            if (
              typeof window !== "undefined" &&
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              try {
                new Notification("바비든든", {
                  body: `${updatedOrder.pickupNumber}번 주문이 준비되었습니다. 카운터에서 픽업해 주세요.`,
                });
              } catch (e) {
                console.error("브라우저 알림 발송 실패:", e);
              }
            }
          }

          if (intervalId) clearInterval(intervalId);
          navigateRef.current(`/user/orders/${orderId}/complete`, { replace: true });
          return;
        }

        // 취소 (CANCELED) 상태인 경우 polling 중단
        if (updatedOrder.status === "CANCELED") {
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

    // 1. 진입 직후 1회 조회를 실행
    fetchOrderDetails();

    // 2. 2초마다 폴링 (호출 직후 반영 지연 최소화)
    intervalId = setInterval(fetchOrderDetails, 2000);

    // 3. cleanup에서 clearInterval 실행
    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
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

  // 상태 메시지 분기
  let statusMessage = "주문이 접수되었습니다. 잠시만 기다려 주세요!";
  let stepIndex = 0; // 0: 주문완료, 1: 조리중, 2: 준비완료

  if (order.status === "PREPARING") {
    statusMessage = "맛있게 조리 중입니다. 잠시만 기다려 주세요!";
    stepIndex = 1;
  } else if (order.status === "READY" || order.status === "COMPLETED") {
    statusMessage = "음식이 준비되었습니다. 카운터에서 픽업해주세요!";
    stepIndex = 2;
  } else if (order.status === "CANCELED") {
    statusMessage = "주문이 취소되었습니다.";
  }

  // 선택한 옵션 포맷터
  const formatSelectedOptions = (options: MenuOption[]) => {
    const counts: Record<string, number> = {};
    const orderList: string[] = [];

    options.forEach((opt) => {
      if (!counts[opt.name]) {
        counts[opt.name] = 0;
        orderList.push(opt.name);
      }
      counts[opt.name]++;
    });

    return orderList
      .map((name) => {
        const qty = counts[name];
        return qty > 1 ? `${name} x${qty}` : name;
      })
      .join(" / ");
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50/30 pb-6 overflow-y-auto">
      {/* 1. 대기번호 */}
      <div className="bg-white border-b border-gray-100 p-6 text-center space-y-2">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">내 대기번호</p>
        <h2 className="text-6xl font-black text-gray-900 tracking-tight">{order.pickupNumber}</h2>
        <p className="text-xs font-bold text-gray-700 mt-2">{statusMessage}</p>
      </div>

      {/* 2. 조리 진행도 스텝 바 */}
      <div className="bg-white border-y border-gray-100 p-6 flex justify-around items-center relative">
        <div className="absolute left-[16%] right-[16%] top-[38%] h-[3px] bg-gray-200 z-0"></div>
        <div
          className="absolute left-[16%] top-[38%] h-[3px] bg-[#009E39] z-0 transition-all duration-700"
          style={{ width: stepIndex === 0 ? "0%" : stepIndex === 1 ? "34%" : "68%" }}
        ></div>

        {/* 1단계 */}
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
          <span className={`text-[9px] font-bold mt-2 ${stepIndex >= 0 ? "text-[#009E39]" : "text-gray-400"}`}>
            주문 완료
          </span>
        </div>

        {/* 2단계 */}
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
          <span className={`text-[9px] font-bold mt-2 ${stepIndex >= 1 ? "text-[#009E39]" : "text-gray-400"}`}>
            조리 중
          </span>
        </div>

        {/* 3단계 */}
        <div className="flex flex-col items-center z-10">
          <div
            className={`w-6.5 h-6.5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
              stepIndex >= 2
                ? "bg-[#009E39] border-[#009E39] text-white"
                : "bg-white border-gray-300 text-gray-400"
            }`}
          >
            {stepIndex === 2 ? "✓" : "3"}
          </div>
          <span className={`text-[9px] font-bold mt-2 ${stepIndex >= 2 ? "text-[#009E39]" : "text-gray-400"}`}>
            준비 완료
          </span>
        </div>
      </div>

      {/* 3. 대기 현황 정보 박스 */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm">
            <span className="text-[10px] font-bold text-gray-400 block mb-1">내 앞 대기</span>
            <span className="text-xl font-black text-gray-800">
              {order.waitingCount > 0 ? `${order.waitingCount}명` : "없음"}
            </span>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm">
            <span className="text-[10px] font-bold text-gray-400 block mb-1">예상 대기 시간</span>
            <span className="text-xl font-black text-gray-800">
              {order.status === "READY" || order.status === "COMPLETED"
                ? "조리 완료"
                : `약 ${order.waitingCount > 0 ? order.waitingTime : 1}분`}
            </span>
          </div>
        </div>
      </div>

      {/* 4. 주문 상세 정보 */}
      <div className="px-4 space-y-3">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3 shadow-sm text-[11px]">
          <div className="flex justify-between items-center text-gray-500 font-semibold">
            <span>주문 시간</span>
            <span className="font-extrabold text-gray-800">{order.createdAt}</span>
          </div>
        </div>

        {/* 5. 주문 내역 목록 */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3.5 shadow-sm">
          <h3 className="text-xs font-bold text-gray-900 border-b border-gray-100 pb-2">주문 내역</h3>
          <div className="space-y-3.5 pl-1.5">
            {order.items.map((item) => {
              const optionString = formatSelectedOptions(item.selectedOptions);
              return (
                <div key={item.cartItemId} className="text-xs space-y-0.5">
                  <div className="flex items-center gap-1.5 text-gray-800 font-bold">
                    <span>•</span>
                    <span>{item.menuName}</span>
                  </div>
                  {optionString && (
                    <p className="text-[10px] text-gray-400 pl-3 leading-relaxed font-semibold">
                      {optionString}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 하단 안내 멘트 */}
      <div className="text-center py-5 text-gray-400">
        <p className="text-[9px] font-bold">※ 실시간으로 업데이트됩니다.</p>
      </div>
    </div>
  );
};

export default OrderStatusPage;
