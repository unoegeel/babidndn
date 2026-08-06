import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Order } from "../../types/user";

const DISMISSED_KEY = "babi_ready_banner_dismissed";

function readDismissed(): Set<string> {
  try {
    const raw = sessionStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function persistDismissed(ids: Set<string>) {
  try {
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
}

interface ReadyOrderBannerProps {
  readyOrders: Order[];
  visible: boolean;
}

/** 메뉴 첫 화면 상단에서 준비완료를 알리는 슬라이드 다운 배너 */
export const ReadyOrderBanner: React.FC<ReadyOrderBannerProps> = ({ readyOrders, visible }) => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<Set<string>>(() => readDismissed());
  const [entering, setEntering] = useState(false);

  const bannerOrder = readyOrders.find((o) => !dismissed.has(o.orderId)) ?? null;

  useEffect(() => {
    if (!visible || !bannerOrder) {
      setEntering(false);
      return;
    }
    const id = window.requestAnimationFrame(() => setEntering(true));
    return () => window.cancelAnimationFrame(id);
  }, [visible, bannerOrder?.orderId]);

  if (!visible || !bannerOrder) {
    return null;
  }

  const dismiss = () => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(bannerOrder.orderId);
      persistDismissed(next);
      return next;
    });
  };

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 top-14 z-[55] flex justify-center px-3 transition-transform duration-300 ease-out ${
        entering ? "translate-y-0" : "-translate-y-[120%]"
      }`}
    >
      <div className="pointer-events-auto mt-2 w-full max-w-[400px] rounded-2xl border border-green-200 bg-white p-3 shadow-lg shadow-green-900/10">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold text-gray-900">준비 완료</p>
            <p className="mt-0.5 text-[11px] font-semibold leading-snug text-gray-600">
              <span className="font-extrabold text-green-700">{bannerOrder.pickupNumber}번</span> 주문이
              준비되었습니다. 카운터에서 픽업해 주세요.
            </p>
            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                onClick={() => navigate(`/user/orders/${bannerOrder.orderId}/complete`)}
                className="rounded-xl bg-green-600 px-3 py-2 text-[10px] font-bold text-white cursor-pointer hover:bg-green-700"
              >
                주문 확인
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-xl border border-gray-200 px-3 py-2 text-[10px] font-bold text-gray-500 cursor-pointer hover:bg-gray-50"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReadyOrderBanner;
