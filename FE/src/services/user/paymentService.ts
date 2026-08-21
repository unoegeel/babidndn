import { api, getOrderApiBaseUrl } from "../../api/client";
import type { PaymentResponse } from "../../types/api";
import { orderAccessTokenHeaders } from "../../utils/orderAccessToken";

/** 유저 결제 조회 — X-Order-Access-Token 필요 */
export const userPaymentService = {
  /**
   * GET /api/payments/orders/{orderId}
   * 결제 전이면 404
   */
  getByOrderId(orderId: number | string): Promise<PaymentResponse> {
    return api.get<PaymentResponse>(`/api/payments/orders/${orderId}`, {
      baseUrl: getOrderApiBaseUrl(),
      headers: orderAccessTokenHeaders(orderId),
    });
  },
};
