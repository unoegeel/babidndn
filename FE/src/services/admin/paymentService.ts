import { adminApi } from "../../api/client";
import type { AdminPaymentHistoryItem, PaymentResponse } from "../../types/api";

/**
 * 관리자 결제 API (Bearer JWT — ROLE_ADMIN)
 * 정합성 진단은 Developer Console (/api/dev/reconciliation) 담당.
 */
export const paymentService = {
  /**
   * 전체 결제 내역 (approvedAt DESC) — 주문 queue API와 독립
   * GET /api/admin/payments
   */
  listHistory(): Promise<AdminPaymentHistoryItem[]> {
    return adminApi.get<AdminPaymentHistoryItem[]>("/api/admin/payments");
  },

  /**
   * GET /api/payments/orders/{orderId}
   */
  getByOrderId(orderId: number | string): Promise<PaymentResponse> {
    return adminApi.get<PaymentResponse>(`/api/payments/orders/${orderId}`);
  },

  /**
   * POST /api/payments/{paymentKey}/cancel
   */
  cancel(paymentKey: string, cancelReason: string): Promise<PaymentResponse> {
    return adminApi.post<PaymentResponse>(`/api/payments/${paymentKey}/cancel`, {
      cancelReason,
    });
  },
};
