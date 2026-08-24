package com.gdgoc.babi_order.payment.reconciliation;

/**
 * Stable identity for a logical anomaly.
 * OPEN rows also store the same value in active_key (UNIQUE) for dedup.
 */
public final class ReconciliationLogicalKeys {

    private ReconciliationLogicalKeys() {
    }

    public static String of(ReconciliationIssueType type, Long orderId, Long paymentId) {
        return switch (type) {
            case PAYMENT_DONE_ORDER_NOT_ACTIVATED,
                 PAYMENT_AMOUNT_MISMATCH,
                 ORDER_ACTIVE_WITH_CANCELED_PAYMENT ->
                    type.name() + ":" + orderId + ":" + paymentId;
            case ORDER_ACTIVATED_WITHOUT_VALID_PAYMENT,
                 ORDER_ACTIVATED_WITHOUT_PAYMENT,
                 MULTIPLE_VALID_PAYMENTS ->
                    type.name() + ":" + orderId;
        };
    }
}
