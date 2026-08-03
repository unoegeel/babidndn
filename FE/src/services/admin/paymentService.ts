import { api } from "../../api/client";
import type { PaymentResponse } from "../../types/api";

/**
 * 결제 API 서비스
 */
export const paymentService = {
  /**
   * 주문 ID 로 결제 조회 (결제 전이면 404 PAYMENT_NOT_FOUND)
   * GET /api/payments/orders/{orderId}
   */
  getByOrderId(orderId: number | string): Promise<PaymentResponse> {
    return api.get<PaymentResponse>(`/api/payments/orders/${orderId}`);
  },

  /**
   * 결제 취소
   * POST /api/payments/{paymentKey}/cancel
   */
  cancel(paymentKey: string, cancelReason: string): Promise<PaymentResponse> {
    return api.post<PaymentResponse>(`/api/payments/${paymentKey}/cancel`, {
      cancelReason,
    });
  },
};
