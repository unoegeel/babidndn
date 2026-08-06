import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Order } from "../../types/user";

const DISMISSED_KEY = "babi_ready_banner_dismissed";

function readDismissed(): Set<string> {
  try {
    // 예전 sessionStorage 값을 localStorage로 이전
    const fromSession = sessionStorage.getItem(DISMISSED_KEY);
    if (fromSession && !localStorage.getItem(DISMISSED_KEY)) {
      localStorage.setItem(DISMISSED_KEY, fromSession);
      sessionStorage.removeItem(DISMISSED_KEY);
    }
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function persistDismissed(ids: Set<string>) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
    sessionStorage.removeItem(DISMISSED_KEY);
  } catch {
    // ignore
  }
}

interface ReadyOrderBannerProps {
  readyOrders: Order[];
  visible: boolean;
}

/** 메뉴 첫 화면 상단에서 준비완료를 알리는 슬라이드 다운 배너 (다중 누적) */
export const ReadyOrderBanner: React.FC<ReadyOrderBannerProps> = ({ readyOrders, visible }) => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<Set<string>>(() => readDismissed());
  const [entering, setEntering] = useState(false);

  const visibleOrders = readyOrders.filter((o) => !dismissed.has(o.orderId));

  useEffect(() => {
    if (!visible || visibleOrders.length === 0) {
      setEntering(false);
      return;
    }
    setEntering(false);
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setEntering(true));
    });
    return () => window.cancelAnimationFrame(id);
  }, [visible, visibleOrders.map((o) => o.orderId).join(",")]);

  if (!visible || visibleOrders.length === 0) {
    return null;
  }

  const dismiss = (orderId: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(orderId);
      persistDismissed(next);
      return next;
    });
  };

  const confirmOrder = (orderId: string) => {
    dismiss(orderId);
    navigate(`/user/orders/${orderId}/complete`);
  };

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 top-14 z-40 flex flex-col items-center gap-2 px-3 pt-2 transition-transform duration-300 ease-out ${
        entering ? "translate-y-0" : "-translate-y-[120%]"
      }`}
    >
      {visibleOrders.map((order) => (
        <div
          key={order.orderId}
          className="pointer-events-auto w-full max-w-[400px] rounded-2xl border border-green-200 bg-white p-3 shadow-lg shadow-green-900/10"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold text-gray-900">준비 완료</p>
              <p className="mt-0.5 text-[11px] font-semibold leading-snug text-gray-600">
                <span className="font-extrabold text-green-700">{order.pickupNumber}번</span> 주문이
                준비되었습니다. 카운터에서 픽업해 주세요.
              </p>
              <div className="mt-2.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => confirmOrder(order.orderId)}
                  className="rounded-xl bg-green-600 px-3 py-2 text-[10px] font-bold text-white cursor-pointer hover:bg-green-700"
                >
                  주문 확인
                </button>
                <button
                  type="button"
                  onClick={() => dismiss(order.orderId)}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-[10px] font-bold text-gray-500 cursor-pointer hover:bg-gray-50"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReadyOrderBanner;
