/**
 * Payment.status (BE PaymentStatus) → 영수증 UI 표시용 한국어.
 * 실제 enum: DONE | CANCELED | PARTIAL_CANCELED
 */
const PAYMENT_STATUS_LABELS: Record<string, string> = {
  DONE: "결제완료",
  CANCELED: "결제취소",
  PARTIAL_CANCELED: "부분취소",
};

export function formatPaymentStatusLabel(status: string): string {
  const key = status.trim().toUpperCase();
  if (!key) return "-";
  return PAYMENT_STATUS_LABELS[key] ?? "확인불가";
}
