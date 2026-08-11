import { api, getOrderApiBaseUrl } from "../../api/client";
import type { PaymentResponse } from "../../types/api";

/** 유저 결제 조회 (permitAll — 주문 API와 동일 baseUrl 사용) */
export const userPaymentService = {
  /**
   * GET /api/payments/orders/{orderId}
   * 결제 전이면 404
   */
  getByOrderId(orderId: number | string): Promise<PaymentResponse> {
    return api.get<PaymentResponse>(`/api/payments/orders/${orderId}`, {
      baseUrl: getOrderApiBaseUrl(),
    });
  },
};
