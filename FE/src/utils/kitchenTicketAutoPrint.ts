import type { OrderDetailResponse } from "../types/api";
import { sortOrderItemOptions } from "./orderItemOptions";

export type KitchenTicketPrintMode = "new" | "reprint";

/** OrderDetailResponse + 티켓 헤더(신규 주문 / 재출력) */
export function buildKitchenTicketPayload(
  orderDetail: OrderDetailResponse,
  mode: KitchenTicketPrintMode,
): OrderDetailResponse & { ticketHeader: string } {
  return {
    ...orderDetail,
    items: orderDetail.items.map((item) => ({
      ...item,
      options: sortOrderItemOptions(item.options),
    })),
    ticketHeader: mode === "reprint" ? "재출력" : "신규 주문",
  };
}

export function printKitchenTicket(
  orderDetail: OrderDetailResponse,
  mode: KitchenTicketPrintMode,
): void {
  const payload = buildKitchenTicketPayload(orderDetail, mode);
  window.Android?.printKitchenTicket(JSON.stringify(payload));
}

/** 앱 세션 동안 이미 출력(또는 기준선에 포함)한 주문 ID */
const printedOrderIds = new Set<number>();

/** 첫 refresh 기준선 확정 여부 — 기존 주문은 출력하지 않음 */
let baselineReady = false;

/**
 * 진행 중 주문 목록과 동기화해, 세션 중 새로 나타난 주문만 주방 티켓을 1회 출력합니다.
 * - 첫 호출: 현재 ID를 모두 출력 완료로 표시(기준선)하고 인쇄하지 않음
 * - 이후: Set에 없는 ID만 OrderDetailResponse 로 인쇄 후 Set에 추가
 */
export function syncKitchenTicketAutoPrint(
  activeOrderIds: number[],
  getDetail: (orderId: number) => OrderDetailResponse | undefined,
): void {
  if (!baselineReady) {
    for (const id of activeOrderIds) {
      printedOrderIds.add(id);
    }
    baselineReady = true;
    return;
  }

  for (const id of activeOrderIds) {
    if (printedOrderIds.has(id)) continue;

    const orderDetail = getDetail(id);
    if (!orderDetail) continue;

    // 재시도 폭주를 막기 위해 인쇄 시도 전에 기록
    printedOrderIds.add(id);

    try {
      printKitchenTicket(orderDetail, "new");
    } catch (err) {
      console.error(`주방 티켓 자동 출력 실패 (id=${id}):`, err);
    }
  }
}
