/**
 * Payment.status (BE PaymentStatus) → 화면 표시용 한국어.
 * 전자영수증·관리자 결제내역 공통 진입점.
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
