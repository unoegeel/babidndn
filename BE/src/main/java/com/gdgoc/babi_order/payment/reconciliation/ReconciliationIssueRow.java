package com.gdgoc.babi_order.payment.reconciliation;

import java.time.LocalDateTime;

/**
 * 정합 탐지 쿼리 projection (DB row → service).
 */
public record ReconciliationIssueRow(
        ReconciliationIssueType type,
        Long orderId,
        Long paymentId,
        Integer orderTotalAmount,
        Integer paymentAmount,
        Integer pickupNumber,
        Long donePaymentCount,
        LocalDateTime referenceAt
) {
}
