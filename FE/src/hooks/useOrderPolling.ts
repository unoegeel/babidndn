import { useEffect, useEffectEvent } from "react";
import { orderService, mapOrderDetailToOrder } from "../services/user/orderService";
import type { Order } from "../types/user";

export type UseOrderPollingOptions = {
  /** 폴링할 주문 ID 목록 (단일도 배열로 전달) */
  orderIds: string[];
  intervalMs: number;
  /** false면 폴링하지 않음 (기본 true) */
  enabled?: boolean;
  /** getOrder + map 성공 시 호출 — 알림/READY UX 등은 호출부 책임 */
  onOrderUpdate: (order: Order) => void;
  /** 개별 주문 조회 실패 시 (선택) */
  onError?: (orderId: string, error: unknown) => void;
};

/**
 * 주문 상세 조회 + ViewModel 매핑만 담당하는 폴링 hook.
 * 알림·confetti·navigation·상태 저장은 호출부에서 처리한다.
 */
export function useOrderPolling({
  orderIds,
  intervalMs,
  enabled = true,
  onOrderUpdate,
  onError,
}: UseOrderPollingOptions): void {
  const onOrderUpdateEvent = useEffectEvent(onOrderUpdate);
  const onErrorEvent = useEffectEvent((orderId: string, error: unknown) => {
    onError?.(orderId, error);
  });

  const orderIdsKey = orderIds.join(",");

  useEffect(() => {
    if (!enabled || !orderIdsKey) return;

    const ids = orderIdsKey.split(",").filter(Boolean);
    if (ids.length === 0) return;

    let cancelled = false;

    const poll = async () => {
      await Promise.all(
        ids.map(async (id) => {
          try {
            const res = await orderService.getOrder(id);
            if (cancelled) return;
            const order = mapOrderDetailToOrder(res);
            if (cancelled) return;
            onOrderUpdateEvent(order);
          } catch (err) {
            if (cancelled) return;
            onErrorEvent(id, err);
          }
        }),
      );
    };

    void poll();
    const intervalId = window.setInterval(() => {
      void poll();
    }, intervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [orderIdsKey, intervalMs, enabled]);
}
