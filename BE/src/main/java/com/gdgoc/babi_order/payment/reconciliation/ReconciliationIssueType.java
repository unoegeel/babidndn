package com.gdgoc.babi_order.payment.reconciliation;

/**
 * Order ↔ Payment 정합성 이상 유형.
 * valid payment = status DONE (CANCELED / PARTIAL_CANCELED 제외).
 */
public enum ReconciliationIssueType {
    /** Payment DONE 인데 픽업번호 미발급(0) */
    PAYMENT_DONE_ORDER_NOT_ACTIVATED,
    /** 픽업번호 발급됐는데 DONE Payment 없음 */
    ORDER_ACTIVATED_WITHOUT_VALID_PAYMENT,
    /** DONE Payment 금액 ≠ Order.totalAmount */
    PAYMENT_AMOUNT_MISMATCH,
    /** 동일 Order에 DONE Payment 2건 이상 */
    MULTIPLE_VALID_PAYMENTS
}
