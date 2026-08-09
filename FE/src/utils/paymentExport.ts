import type { Payment } from "../types/admin";
import type { OrderDetailResponse } from "../types/api";
import { formatOrderItemOptionLabels } from "./orderItemOptions";

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

/** date(YYYY-MM-DD) 또는 datetime-local → 포함 시작/종료(ms) */
export function rangeFromDateInputs(
  startLocal: string,
  endLocal: string,
): { startMs: number; endMs: number } | null {
  if (!startLocal || !endLocal) return null;

  const startDay = startLocal.slice(0, 10);
  const endDay = endLocal.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDay) || !/^\d{4}-\d{2}-\d{2}$/.test(endDay)) {
    return null;
  }

  const startMs = new Date(`${startDay}T00:00:00`).getTime();
  const endMs = new Date(`${endDay}T23:59:59.999`).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  if (endMs < startMs) return null;
  return { startMs, endMs };
}

/** @deprecated rangeFromDateInputs 사용 */
export function rangeFromDatetimeLocal(
  startLocal: string,
  endLocal: string,
): { startMs: number; endMs: number } | null {
  return rangeFromDateInputs(startLocal, endLocal);
}

export function defaultExportRangeLocal(): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  const toDate = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  return { start: toDate(start), end: toDate(end) };
}
