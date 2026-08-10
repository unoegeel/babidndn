import type { Payment } from "../types/admin";
import type { OrderDetailResponse } from "../types/api";
import { formatOrderItemOptionLabels } from "./orderItemOptions";
import { seoulDateKey, seoulDayBoundsMs } from "./serverDate";

export type PaymentExportFormat = "csv" | "txt";

const HEADERS = [
  "결제시간",
  "주문번호",
  "결제수단",
  "결제금액",
  "상태",
  "주문메뉴",
] as const;

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** 주문 상세가 있으면 메뉴명·수량·옵션을 한 칸에 요약 */
export function formatPaymentMenusForExport(
  detail: OrderDetailResponse | undefined,
  fallbackSummary: string,
): string {
  if (!detail || detail.items.length === 0) {
    return fallbackSummary || "-";
  }
  return detail.items
    .map((item) => {
      const options = formatOrderItemOptionLabels(item.options);
      const name =
        item.quantity > 1 ? `${item.menuName} x${item.quantity}` : item.menuName;
      return options.length > 0 ? `${name}(${options.join("/")})` : name;
    })
    .join(" | ");
}

export function buildPaymentExportText(
  rows: Array<{
    payment: Payment;
    menus: string;
  }>,
): string {
  const lines = [
    HEADERS.join(","),
    ...rows.map(({ payment, menus }) =>
      [
        payment.paidAt,
        String(payment.orderNumber),
        payment.method,
        String(payment.amount),
        payment.status,
        menus,
      ]
        .map((v) => escapeCsvField(v))
        .join(","),
    ),
  ];
  return lines.join("\r\n") + "\r\n";
}

export function downloadPaymentExport(
  content: string,
  format: PaymentExportFormat,
  fileStem: string,
) {
  const bom = "\uFEFF";
  const mime =
    format === "csv" ? "text/csv;charset=utf-8" : "text/plain;charset=utf-8";
  const blob = new Blob([bom + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileStem}.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** date(YYYY-MM-DD) 또는 datetime-local → 서울 달력일 포함 시작/종료(ms) */
export function rangeFromDateInputs(
  startLocal: string,
  endLocal: string,
): { startMs: number; endMs: number } | null {
  if (!startLocal || !endLocal) return null;

  const startDay = startLocal.slice(0, 10);
  const endDay = endLocal.slice(0, 10);
  const startBounds = seoulDayBoundsMs(startDay);
  const endBounds = seoulDayBoundsMs(endDay);
  if (!startBounds || !endBounds) return null;
  if (endBounds.endMs < startBounds.startMs) return null;
  return { startMs: startBounds.startMs, endMs: endBounds.endMs };
}

/** @deprecated rangeFromDateInputs 사용 */
export function rangeFromDatetimeLocal(
  startLocal: string,
  endLocal: string,
): { startMs: number; endMs: number } | null {
  return rangeFromDateInputs(startLocal, endLocal);
}

/** 내보내기 기본 기간: 서울 기준 최근 7일(오늘 포함) */
export function defaultExportRangeLocal(): { start: string; end: string } {
  const end = seoulDateKey();
  const endBounds = seoulDayBoundsMs(end);
  const startMs =
    (endBounds?.startMs ?? Date.now()) - 6 * 24 * 60 * 60 * 1000;
  return { start: seoulDateKey(startMs), end };
}
