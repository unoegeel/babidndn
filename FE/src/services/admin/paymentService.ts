import { adminApi } from "../../api/client";
import type {
  PaymentReconciliationResponse,
  PaymentResponse,
  PaymentTossVerifyResponse,
  PersistedReconciliationIssue,
  ReconciliationScanResponse,
} from "../../types/api";

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
   * GET /api/admin/payments/reconciliation?period=1d|7d|30d — snapshot only (no persist)
   */
  getReconciliation(period: "1d" | "7d" | "30d" = "7d"): Promise<PaymentReconciliationResponse> {
    return adminApi.get<PaymentReconciliationResponse>(
      `/api/admin/payments/reconciliation?period=${period}`,
    );
  },

  /**
   * POST /api/admin/payments/reconciliation/scan — detect + persist lifecycle
   */
  scanReconciliation(period: "1d" | "7d" | "30d" = "7d"): Promise<ReconciliationScanResponse> {
    return adminApi.post<ReconciliationScanResponse>(
      `/api/admin/payments/reconciliation/scan?period=${period}`,
    );
  },

  /**
   * GET /api/admin/payments/reconciliation/issues
   */
  listReconciliationIssues(
    status: "OPEN" | "RESOLVED" | "ALL" = "OPEN",
    period: "1d" | "7d" | "30d" = "30d",
  ): Promise<PersistedReconciliationIssue[]> {
    return adminApi.get<PersistedReconciliationIssue[]>(
      `/api/admin/payments/reconciliation/issues?status=${status}&period=${period}`,
    );
  },

  /**
   * POST /api/admin/payments/{paymentId}/verify — Toss read-only
   */
  verifyPayment(paymentId: number): Promise<PaymentTossVerifyResponse> {
    return adminApi.post<PaymentTossVerifyResponse>(`/api/admin/payments/${paymentId}/verify`);
  },
};
