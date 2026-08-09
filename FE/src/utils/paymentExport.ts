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

/** datetime-local 값 → 포함 시작(ms) / 종료(ms, 해당 분 끝까지) */
export function rangeFromDatetimeLocal(
  startLocal: string,
  endLocal: string,
): { startMs: number; endMs: number } | null {
  if (!startLocal || !endLocal) return null;
  const startMs = new Date(startLocal).getTime();
  const endMs = new Date(endLocal).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  if (endMs < startMs) return null;
  // datetime-local은 초가 없으면 :00 — 종료 시각의 해당 분 끝까지 포함
  const endInclusive = endLocal.length === 16 ? endMs + 59_999 : endMs;
  return { startMs, endMs: endInclusive };
}

export function defaultExportRangeLocal(): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 0, 0);
  const toLocal = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  return { start: toLocal(start), end: toLocal(end) };
}
