import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUserData } from "../../store/UserDataContext";
import { orderService, mapOrderDetailToOrder } from "../../services/user/orderService";
import type { MenuOption, Order } from "../../types/user";

export const OrderCompletePage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { getOrderById, saveOrderToState } = useUserData();

  const [order, setOrder] = useState<Order | null>(() => (orderId ? getOrderById(orderId) : null));
  const [loading, setLoading] = useState<boolean>(!order);

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
    <div className="flex-1 flex flex-col bg-gray-50/30 overflow-hidden h-full">
      {/* 1. 스크롤 가능한 상단 주문 현황 콘텐츠 영역 */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-6">
        {/* 대기번호 */}
        <div className="bg-white border-b border-gray-100 p-6 text-center space-y-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">내 대기번호</p>
          <h2 className="text-6xl font-black text-[#009E39] tracking-tight">{order.pickupNumber}</h2>
          <p className="text-xs font-bold text-gray-700 mt-2">
            음식이 준비되었습니다. 카운터에서 픽업해주세요!
          </p>
        </div>

        {/* 조리 진행도 스텝 바 */}
        <div className="bg-white border-y border-gray-100 p-6 flex justify-around items-center relative">
          <div className="absolute left-[16%] right-[16%] top-[38%] h-[3px] bg-[#009E39] z-0"></div>

          {/* 1단계 */}
          <div className="flex flex-col items-center z-10">
            <div className="w-6.5 h-6.5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 bg-[#009E39] border-[#009E39] text-white">
              ✓
            </div>
            <span className="text-[9px] font-bold mt-2 text-[#009E39]">주문 완료</span>
          </div>

          {/* 2단계 */}
          <div className="flex flex-col items-center z-10">
            <div className="w-6.5 h-6.5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 bg-[#009E39] border-[#009E39] text-white">
              ✓
            </div>
            <span className="text-[9px] font-bold mt-2 text-[#009E39]">조리 중</span>
          </div>

          {/* 3단계 */}
          <div className="flex flex-col items-center z-10">
            <div className="w-6.5 h-6.5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 bg-[#009E39] border-[#009E39] text-white">
              ✓
            </div>
            <span className="text-[9px] font-bold mt-2 text-[#009E39]">준비 완료</span>
          </div>
        </div>

        {/* 대기 현황 정보 박스 */}
        <div className="px-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm">
              <span className="text-[10px] font-bold text-gray-400 block mb-1">내 앞 대기</span>
              <span className="text-xl font-black text-gray-800">없음</span>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm">
              <span className="text-[10px] font-bold text-gray-400 block mb-1">대기 시간</span>
              <span className="text-xl font-black text-gray-800">
                {order.waitingTime > 0 ? `약 ${order.waitingTime}분` : "조리 완료"}
              </span>
            </div>
          </div>
        </div>

        {/* 주문 상세 정보 */}
        <div className="px-4 space-y-3">
          <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3 shadow-sm text-[11px]">
            <div className="flex justify-between items-center text-gray-500 font-semibold">
              <span>주문 시간</span>
              <span className="font-extrabold text-gray-800">{order.createdAt}</span>
            </div>
          </div>

          {/* 주문 내역 목록 (뷸렛 형태) */}
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
          <p className="text-[9px] font-bold">※ 실시간으로 업데이트됩니다.</p>
        </div>
      </div>
    </div>
  );
};

export default OrderCompletePage;
