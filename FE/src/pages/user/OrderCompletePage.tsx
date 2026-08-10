import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUserData } from "../../store/UserDataContext";
import { orderService, mapOrderDetailToOrder } from "../../services/user/orderService";
import { formatSelectedOptions } from "../../utils/formatSelectedOptions";
import { claimReadyConfetti } from "../../utils/readyCall";
import type { Order } from "../../types/user";

export const OrderCompletePage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { getOrderById, saveOrderToState, readyCallSignal, orders, startConfetti } = useUserData();

  const [order, setOrder] = useState<Order | null>(() => (orderId ? getOrderById(orderId) : null));
  const [loading, setLoading] = useState<boolean>(!order);
  const startConfettiRef = useRef(startConfetti);

  useEffect(() => {
    startConfettiRef.current = startConfetti;
  });

  // 컨텍스트 폴링으로 갱신된 주문 반영
  useEffect(() => {
    if (!orderId) return;
    const latest = getOrderById(orderId);
    if (latest) setOrder(latest);
  }, [orderId, orders, getOrderById]);

  // 재호출 시그널 → Confetti (주문 현황/완료 화면)
  useEffect(() => {
    if (!orderId || !readyCallSignal) return;
    if (!readyCallSignal.isRecall) return;
    if (readyCallSignal.orderId !== orderId) return;
    if (!claimReadyConfetti(orderId, readyCallSignal.updatedAt)) return;
    startConfettiRef.current(readyCallSignal.updatedAt);
  }, [readyCallSignal, orderId]);

  useEffect(() => {
    if (!orderId) {
      navigate("/user", { replace: true });
      return;
    }

    if (!order) {
      orderService
        .getOrder(orderId)
        .then((res) => {
          const fetchedOrder = mapOrderDetailToOrder(res);
          setOrder(fetchedOrder);
          saveOrderToState(fetchedOrder);
        })
        .catch((err) => {
          console.error("주문 완료 정보 조회 실패:", err);
          alert("주문 정보를 불러올 수 없습니다.");
          navigate("/user", { replace: true });
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [orderId, order, saveOrderToState, navigate]);

  if (loading || !order) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <p className="text-gray-500 font-semibold text-xs">준비 완료 내역을 불러오고 있습니다...</p>
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col bg-gray-50/30 overflow-hidden h-full">
      {/* 주문 현황과 동일: 대기번호·상태바는 밀착, space-y로 사이 여백을 만들지 않음 */}
      <div className="flex-1 overflow-y-auto pb-6">
        {/* 대기번호 — OrderStatusPage 1블록과 동일 구조 */}
        <div className="bg-white border-b border-gray-100 p-6 text-center space-y-2 shrink-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">내 대기번호</p>
          <h2 className="text-6xl font-extrabold leading-[1.05] text-[#009E39] tracking-tight">
            {order.pickupNumber}
          </h2>
          <p className="min-h-[2.5rem] text-xs font-semibold text-gray-700 leading-snug">
            음식이 준비되었습니다. 카운터에서 픽업해주세요!
          </p>
        </div>

        {/* 조리 진행도 스텝 바 — OrderStatusPage 2블록과 동일하게 바로 아래 배치 */}
        <div className="bg-white border-y border-gray-100 p-6 flex justify-around items-center relative shrink-0">
          <div className="absolute left-[16%] right-[16%] top-[38%] h-[3px] bg-[#009E39] z-0"></div>

          <div className="flex flex-col items-center z-10 shrink-0">
            <div className="w-6.5 h-6.5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold border-2 bg-[#009E39] border-[#009E39] text-white">
              ✓
            </div>
            <span className="text-[11px] font-semibold mt-2 whitespace-nowrap text-[#009E39]">주문 완료</span>
          </div>

          <div className="flex flex-col items-center z-10 shrink-0">
            <div className="w-6.5 h-6.5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold border-2 bg-[#009E39] border-[#009E39] text-white">
              ✓
            </div>
            <span className="text-[11px] font-semibold mt-2 whitespace-nowrap text-[#009E39]">조리 중</span>
          </div>

          <div className="flex flex-col items-center z-10 shrink-0">
            <div className="w-6.5 h-6.5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold border-2 bg-[#009E39] border-[#009E39] text-white">
              ✓
            </div>
            <span className="text-[11px] font-semibold mt-2 whitespace-nowrap text-[#009E39]">준비 완료</span>
          </div>
        </div>

        {/* 대기 현황 정보 박스 */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm">
              <span className="text-[11px] font-medium text-gray-400 block mb-1 leading-snug">내 앞 대기</span>
              <span className="text-xl font-bold text-gray-800 leading-[1.1]">없음</span>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm">
              <span className="text-[11px] font-medium text-gray-400 block mb-1 leading-snug">대기 시간</span>
              <span className="text-xl font-bold text-gray-800 leading-[1.1]">
                {order.waitingTime > 0 ? `약 ${order.waitingTime}분` : "조리 완료"}
              </span>
            </div>
          </div>
        </div>

        {/* 주문 상세 정보 */}
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
        </div>
      </div>

      {/* 2. 하단 고정 액션 영역 */}
      <div
        className="shrink-0 p-4 bg-white border-t border-gray-100 shadow-lg flex flex-col gap-3 z-40"
        style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}
      >
        <button
          onClick={() => navigate("/user")}
          className="w-full bg-black text-white py-4 rounded-xl font-bold text-sm transition-colors hover:bg-gray-800 cursor-pointer text-center shadow-md"
        >
          처음 화면으로 이동
        </button>
        <div className="text-center text-gray-400">
          <p className="text-[11px] font-medium leading-snug">※ 실시간으로 업데이트됩니다.</p>
        </div>
      </div>
    </div>
  );
};

export default OrderCompletePage;
