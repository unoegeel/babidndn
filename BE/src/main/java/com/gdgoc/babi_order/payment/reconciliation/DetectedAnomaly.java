package com.gdgoc.babi_order.payment.reconciliation;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * In-memory anomaly detected by Phase A queries (not yet persisted).
 */
public record DetectedAnomaly(
        ReconciliationIssueType type,
        ReconciliationSeverity severity,
        Long orderId,
        Long paymentId,
        String logicalKey,
        String message,
        Map<String, Object> metadata,
        LocalDateTime referenceAt
) {
    public static DetectedAnomaly from(ReconciliationIssueRow row) {
        ReconciliationSeverity severity = switch (row.type()) {
            case PAYMENT_DONE_ORDER_NOT_ACTIVATED,
                 ORDER_ACTIVATED_WITHOUT_VALID_PAYMENT,
                 MULTIPLE_VALID_PAYMENTS -> ReconciliationSeverity.CRITICAL;
            case PAYMENT_AMOUNT_MISMATCH -> ReconciliationSeverity.WARNING;
        };

        Map<String, Object> metadata = new LinkedHashMap<>();
        if (row.orderTotalAmount() != null) {
            metadata.put("orderTotalAmount", row.orderTotalAmount());
        }
        if (row.paymentAmount() != null) {
            metadata.put("paymentAmount", row.paymentAmount());
        }
        if (row.pickupNumber() != null) {
            metadata.put("pickupNumber", row.pickupNumber());
        }
        if (row.donePaymentCount() != null) {
            metadata.put("donePaymentCount", row.donePaymentCount());
        }

        return new DetectedAnomaly(
                row.type(),
                severity,
                row.orderId(),
                row.paymentId(),
                ReconciliationLogicalKeys.of(row.type(), row.orderId(), row.paymentId()),
                buildMessage(row),
                metadata,
                row.referenceAt()
        );
    }

    private static String buildMessage(ReconciliationIssueRow row) {
        return switch (row.type()) {
            case PAYMENT_DONE_ORDER_NOT_ACTIVATED ->
                    "결제는 DONE인데 주문 픽업번호가 미발급(0)입니다. activateAfterPayment 누락 가능성이 있습니다.";
            case ORDER_ACTIVATED_WITHOUT_VALID_PAYMENT ->
                    "픽업번호가 발급됐지만 DONE 결제가 없습니다.";
            case PAYMENT_AMOUNT_MISMATCH ->
                    "주문 금액(" + row.orderTotalAmount() + ")과 결제 금액(" + row.paymentAmount() + ")이 다릅니다.";
            case MULTIPLE_VALID_PAYMENTS ->
                    "동일 주문에 DONE 결제가 " + row.donePaymentCount() + "건 있습니다.";
        };
    }
}
