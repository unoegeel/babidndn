import { useEffect, useState } from "react";
import { orderService } from "../../services/user/orderService";

const POLL_MS = 3000;

/** 주문 전 매장 전체 대기 현황. 개인 waitingAheadCount 와 분리. */
export function WaitingStatusBar() {
  const [waitingCount, setWaitingCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await orderService.getWaitingCount();
        if (!cancelled && typeof res.waitingCount === "number") {
          setWaitingCount(Math.max(0, res.waitingCount));
        }
      } catch {
        // 실패 시 0명으로 위장하지 않음. 성공한 적 없으면 숨김, 있으면 마지막 값 유지.
      }
    };

    void load();
    const timerId = window.setInterval(() => {
      void load();
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timerId);
    };
  }, []);

  if (waitingCount === null) {
    return null;
  }

  const waitMinutes = waitingCount * 2;

  return (
    <div className="shrink-0 border-b border-gray-100 bg-white px-4 py-2 text-center">
      <p className="text-[11px] font-medium leading-snug text-gray-500">
        현재 대기 {waitingCount}명 · 예상 대기시간 약 {waitMinutes}분
      </p>
    </div>
  );
}
