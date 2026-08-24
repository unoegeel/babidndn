import { adminApi } from "../../api/client";
import type {
  PaymentReconciliationResponse,
  PaymentTossVerifyResponse,
  PersistedReconciliationIssue,
  ReconciliationScanResponse,
} from "../../types/api";

/**
 * Developer Console — payment/order reconciliation diagnostics (ROLE_DEVELOPER).
 */
export const developerReconciliationService = {
  getSnapshot(period: "1d" | "7d" | "30d" = "7d"): Promise<PaymentReconciliationResponse> {
    return adminApi.get<PaymentReconciliationResponse>(
      `/api/dev/reconciliation?period=${period}`,
    );
  },

  scan(period: "1d" | "7d" | "30d" = "7d"): Promise<ReconciliationScanResponse> {
    return adminApi.post<ReconciliationScanResponse>(
      `/api/dev/reconciliation/scan?period=${period}`,
    );
  },

  listIssues(
    status: "OPEN" | "RESOLVED" | "ALL" = "OPEN",
    period: "1d" | "7d" | "30d" = "30d",
  ): Promise<PersistedReconciliationIssue[]> {
    return adminApi.get<PersistedReconciliationIssue[]>(
      `/api/dev/reconciliation/issues?status=${status}&period=${period}`,
    );
  },

  getIssue(id: number): Promise<PersistedReconciliationIssue> {
    return adminApi.get<PersistedReconciliationIssue>(`/api/dev/reconciliation/issues/${id}`);
  },

  verifyPayment(paymentId: number): Promise<PaymentTossVerifyResponse> {
    return adminApi.post<PaymentTossVerifyResponse>(
      `/api/dev/reconciliation/payments/${paymentId}/verify`,
    );
  },
};
