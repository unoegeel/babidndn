import { adminApi } from "../../api/client";
import type { PaymentReconciliationResponse, PaymentResponse } from "../../types/api";

/**
 * 관리자 결제 API (Bearer JWT — ROLE_ADMIN)
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

  /**
   * GET /api/admin/payments/reconciliation?period=1d|7d|30d
   */
  getReconciliation(period: "1d" | "7d" | "30d" = "7d"): Promise<PaymentReconciliationResponse> {
    return adminApi.get<PaymentReconciliationResponse>(
      `/api/admin/payments/reconciliation?period=${period}`,
    );
  },
};
