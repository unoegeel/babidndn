import { adminApi } from "../../api/client";
import type { PaymentResponse } from "../../types/api";

/**
 * 관리자 결제 API (Bearer JWT — ROLE_ADMIN)
 * 정합성 진단은 Developer Console (/api/dev/reconciliation) 담당.
 */
export const paymentService = {
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
