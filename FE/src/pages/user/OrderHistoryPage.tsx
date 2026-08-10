import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useUserData } from "../../store/UserDataContext";
import type { Order, OrderStatus } from "../../types/user";
import { serverInstantMs } from "../../utils/serverDate";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function orderCreatedMs(createdAt: string): number | null {
  const ms = serverInstantMs(createdAt);
  return Number.isFinite(ms) ? ms : null;
}

function statusLabel(status: OrderStatus): string {
  switch (status) {
    case "PREPARING":
      return "조리중";
    case "READY":
      return "준비완료";
    case "COMPLETED":
      return "픽업완료";
    case "CANCELED":
      return "취소됨";
    default:
      return status;
  }
}

function statusClass(status: OrderStatus): string {
  switch (status) {
    case "PREPARING":
      return "bg-blue-50 text-blue-700";
    case "READY":
      return "bg-green-50 text-green-700";
    case "COMPLETED":
      return "bg-gray-100 text-gray-600";
    case "CANCELED":
      return "bg-red-50 text-red-600";
    default:
      return "bg-gray-100 text-gray-500";
  }
}

function summarizeItems(order: Order): string {
  if (!order.items.length) return "주문 내역";
  const first = order.items[0].menuName;
  const extra = order.items.length - 1;
  return extra > 0 ? `${first} 외 ${extra}건` : first;
}

export const OrderHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { orders } = useUserData();

  const recentOrders = useMemo(() => {
    const cutoff = Date.now() - SEVEN_DAYS_MS;
    return [...orders]
      .filter((o) => {
        const ms = orderCreatedMs(o.createdAt);
        if (ms == null) return true; // 파싱 실패 시 포함
        return ms >= cutoff;
      })
      .sort((a, b) => {
        const timeA = orderCreatedMs(a.createdAt) ?? 0;
        const timeB = orderCreatedMs(b.createdAt) ?? 0;
        if (timeB !== timeA) {
          return timeB - timeA; // 결제시간 내림차순
        }
        const pickupA = Number(a.pickupNumber) || 0;
        const pickupB = Number(b.pickupNumber) || 0;
        if (pickupB !== pickupA) {
          return pickupB - pickupA; // 주문번호(픽업번호) 내림차순
        }
        return Number(b.orderId) - Number(a.orderId);
      });
  }, [orders]);

  const openOrder = (order: Order) => {
    if (order.status === "READY" || order.status === "COMPLETED") {
      navigate(`/user/orders/${order.orderId}/complete`);
    } else if (order.status === "CANCELED") {
      navigate(`/user/orders/${order.orderId}`);
    } else {
      navigate(`/user/orders/${order.orderId}`);
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50/30 p-4">
      <p className="mb-3 text-[11px] font-medium text-gray-400 leading-snug">최근 7일 주문만 표시됩니다</p>

      {recentOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-xs font-bold text-gray-500">최근 주문 내역이 없습니다</p>
          <button
            type="button"
            onClick={() => navigate("/user")}
            className="mt-4 rounded-xl bg-black px-5 py-2.5 text-xs font-bold text-white cursor-pointer"
          >
            메뉴 보러가기
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {recentOrders.map((order) => (
            <li key={order.orderId}>
              <button
                type="button"
                onClick={() => openOrder(order)}
                className="w-full rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm transition-colors hover:border-gray-200 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">
                        {order.pickupNumber}번
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold leading-snug ${statusClass(order.status)}`}
                      >
                        {statusLabel(order.status)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs font-bold text-gray-700">
                      {summarizeItems(order)}
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-gray-400 leading-snug">{order.createdAt}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-gray-900">
                      {order.totalPrice.toLocaleString()}원
                    </p>
                    <span className="mt-2 inline-block text-[11px] font-semibold text-gray-400">보기 →</span>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default OrderHistoryPage;
