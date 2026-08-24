package com.gdgoc.babi_order.payment.reconciliation;

/**
 * Order ↔ Payment 정합성 이상 유형.
 * valid payment = status DONE.
 * <p>
 * {@link #ORDER_ACTIVATED_WITHOUT_VALID_PAYMENT} is deprecated (false-positive prone);
 * kept for reading historically persisted rows. New scans emit the refined types below.
 */
public enum ReconciliationIssueType {
    /** Payment DONE 인데 픽업번호 미발급(0) */
    PAYMENT_DONE_ORDER_NOT_ACTIVATED,

    /**
     * @deprecated Prefer {@link #ORDER_ACTIVATED_WITHOUT_PAYMENT} /
     * {@link #ORDER_ACTIVE_WITH_CANCELED_PAYMENT}.
     */
    @Deprecated
    ORDER_ACTIVATED_WITHOUT_VALID_PAYMENT,

    /** pickupNumber &gt; 0 인데 Payment row 자체가 없음 */
    ORDER_ACTIVATED_WITHOUT_PAYMENT,

    /** PREPARING/READY 인데 Payment가 CANCELED (주문 취소 누락 가능) */
    ORDER_ACTIVE_WITH_CANCELED_PAYMENT,

    /** DONE Payment 금액 ≠ Order.totalAmount */
    PAYMENT_AMOUNT_MISMATCH,

    /** 동일 Order에 DONE Payment 2건 이상 */
    MULTIPLE_VALID_PAYMENTS
}
