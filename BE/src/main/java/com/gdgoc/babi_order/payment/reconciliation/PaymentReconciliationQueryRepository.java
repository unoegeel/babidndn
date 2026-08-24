package com.gdgoc.babi_order.payment.reconciliation;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Order ↔ Payment 이상 후보를 native SQL로 집계한다.
 * 기간 필터는 결제 이슈는 payments.approved_at, 주문 이슈는 orders.updated_at 기준.
 * <p>
 * Cancellation semantics (PaymentService.cancel → cancelOrderDueToPaymentCancel):
 * PREPARING/READY → Order CANCELED; COMPLETED stays COMPLETED after refund.
 * Therefore CANCELED+CANCELED and COMPLETED+CANCELED are not anomalies.
 * PARTIAL_CANCELED is Toss partial refund (webhook) — not treated as full-cancel anomaly.
 */
@Repository
@RequiredArgsConstructor
public class PaymentReconciliationQueryRepository {

    private final EntityManager entityManager;

    public List<ReconciliationIssueRow> findPaymentDoneOrderNotActivated(LocalDateTime fromInclusive) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery("""
                        SELECT p.id,
                               p.order_id,
                               o.total_amount,
                               p.amount,
                               o.pickup_number,
                               p.approved_at
                        FROM payments p
                        INNER JOIN orders o ON o.id = p.order_id
                        WHERE p.status = 'DONE'
                          AND o.pickup_number = 0
                          AND p.approved_at >= :fromInclusive
                        ORDER BY p.approved_at DESC, p.id DESC
                        """)
                .setParameter("fromInclusive", fromInclusive)
                .getResultList();

        List<ReconciliationIssueRow> result = new ArrayList<>(rows.size());
        for (Object[] row : rows) {
            result.add(ReconciliationIssueRow.of(
                    ReconciliationIssueType.PAYMENT_DONE_ORDER_NOT_ACTIVATED,
                    toLong(row[1]),
                    toLong(row[0]),
                    toInteger(row[2]),
                    toInteger(row[3]),
                    toInteger(row[4]),
                    null,
                    toLocalDateTime(row[5])
            ));
        }
        return result;
    }

    /**
     * pickup &gt; 0 and no Payment row at all.
     */
    public List<ReconciliationIssueRow> findOrderActivatedWithoutPayment(LocalDateTime fromInclusive) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery("""
                        SELECT o.id,
                               o.total_amount,
                               o.pickup_number,
                               o.updated_at,
                               o.status
                        FROM orders o
                        WHERE o.pickup_number > 0
                          AND o.updated_at >= :fromInclusive
                          AND NOT EXISTS (
                              SELECT 1
                              FROM payments p
                              WHERE p.order_id = o.id
                          )
                        ORDER BY o.updated_at DESC, o.id DESC
                        """)
                .setParameter("fromInclusive", fromInclusive)
                .getResultList();

        List<ReconciliationIssueRow> result = new ArrayList<>(rows.size());
        for (Object[] row : rows) {
            result.add(new ReconciliationIssueRow(
                    ReconciliationIssueType.ORDER_ACTIVATED_WITHOUT_PAYMENT,
                    toLong(row[0]),
                    null,
                    toInteger(row[1]),
                    null,
                    toInteger(row[2]),
                    0L,
                    toLocalDateTime(row[3]),
                    toString(row[4]),
                    null
            ));
        }
        return result;
    }

    /**
     * Active kitchen order (PREPARING/READY) with CANCELED payment and no DONE payment.
     * Excludes consistent CANCELED+CANCELED and post-complete refund (COMPLETED+CANCELED).
     */
    public List<ReconciliationIssueRow> findOrderActiveWithCanceledPayment(LocalDateTime fromInclusive) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery("""
                        SELECT o.id,
                               o.total_amount,
                               o.pickup_number,
                               o.updated_at,
                               o.status,
                               MAX(p.id) AS payment_id,
                               MAX(p.amount) AS payment_amount
                        FROM orders o
                        INNER JOIN payments p ON p.order_id = o.id AND p.status = 'CANCELED'
                        WHERE o.pickup_number > 0
                          AND o.status IN ('PREPARING', 'READY')
                          AND o.updated_at >= :fromInclusive
                          AND NOT EXISTS (
                              SELECT 1
                              FROM payments d
                              WHERE d.order_id = o.id
                                AND d.status = 'DONE'
                          )
                        GROUP BY o.id, o.total_amount, o.pickup_number, o.updated_at, o.status
                        ORDER BY o.updated_at DESC, o.id DESC
                        """)
                .setParameter("fromInclusive", fromInclusive)
                .getResultList();

        List<ReconciliationIssueRow> result = new ArrayList<>(rows.size());
        for (Object[] row : rows) {
            result.add(new ReconciliationIssueRow(
                    ReconciliationIssueType.ORDER_ACTIVE_WITH_CANCELED_PAYMENT,
                    toLong(row[0]),
                    toLong(row[5]),
                    toInteger(row[1]),
                    toInteger(row[6]),
                    toInteger(row[2]),
                    null,
                    toLocalDateTime(row[3]),
                    toString(row[4]),
                    "CANCELED"
            ));
        }
        return result;
    }

    public List<ReconciliationIssueRow> findPaymentAmountMismatch(LocalDateTime fromInclusive) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery("""
                        SELECT p.id,
                               p.order_id,
                               o.total_amount,
                               p.amount,
                               o.pickup_number,
                               p.approved_at
                        FROM payments p
                        INNER JOIN orders o ON o.id = p.order_id
                        WHERE p.status = 'DONE'
                          AND p.amount <> o.total_amount
                          AND p.approved_at >= :fromInclusive
                        ORDER BY p.approved_at DESC, p.id DESC
                        """)
                .setParameter("fromInclusive", fromInclusive)
                .getResultList();

        List<ReconciliationIssueRow> result = new ArrayList<>(rows.size());
        for (Object[] row : rows) {
            result.add(ReconciliationIssueRow.of(
                    ReconciliationIssueType.PAYMENT_AMOUNT_MISMATCH,
                    toLong(row[1]),
                    toLong(row[0]),
                    toInteger(row[2]),
                    toInteger(row[3]),
                    toInteger(row[4]),
                    null,
                    toLocalDateTime(row[5])
            ));
        }
        return result;
    }

    public List<ReconciliationIssueRow> findMultipleValidPayments(LocalDateTime fromInclusive) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery("""
                        SELECT p.order_id,
                               COUNT(p.id) AS done_count,
                               MAX(p.approved_at) AS latest_approved_at,
                               MAX(o.total_amount) AS order_total,
                               MAX(o.pickup_number) AS pickup_number
                        FROM payments p
                        INNER JOIN orders o ON o.id = p.order_id
                        WHERE p.status = 'DONE'
                          AND p.approved_at >= :fromInclusive
                        GROUP BY p.order_id
                        HAVING COUNT(p.id) > 1
                        ORDER BY latest_approved_at DESC, p.order_id DESC
                        """)
                .setParameter("fromInclusive", fromInclusive)
                .getResultList();

        List<ReconciliationIssueRow> result = new ArrayList<>(rows.size());
        for (Object[] row : rows) {
            result.add(ReconciliationIssueRow.of(
                    ReconciliationIssueType.MULTIPLE_VALID_PAYMENTS,
                    toLong(row[0]),
                    null,
                    toInteger(row[3]),
                    null,
                    toInteger(row[4]),
                    toLong(row[1]),
                    toLocalDateTime(row[2])
            ));
        }
        return result;
    }

    public List<Long> findPaymentIdsStillDoneNotActivated(List<Long> paymentIds) {
        @SuppressWarnings("unchecked")
        List<Number> rows = entityManager.createNativeQuery("""
                        SELECT p.id
                        FROM payments p
                        INNER JOIN orders o ON o.id = p.order_id
                        WHERE p.id IN (:paymentIds)
                          AND p.status = 'DONE'
                          AND o.pickup_number = 0
                        """)
                .setParameter("paymentIds", paymentIds)
                .getResultList();
        return rows.stream().map(Number::longValue).toList();
    }

    /**
     * Deprecated type: never "still anomalous" so false-positive OPEN rows resolve,
     * while the same scan recreates refined issue types when needed.
     */
    public List<Long> findOrderIdsStillActivatedWithoutValidPayment(List<Long> orderIds) {
        return List.of();
    }

    public List<Long> findOrderIdsStillActivatedWithoutPayment(List<Long> orderIds) {
        @SuppressWarnings("unchecked")
        List<Number> rows = entityManager.createNativeQuery("""
                        SELECT o.id
                        FROM orders o
                        WHERE o.id IN (:orderIds)
                          AND o.pickup_number > 0
                          AND NOT EXISTS (
                              SELECT 1
                              FROM payments p
                              WHERE p.order_id = o.id
                          )
                        """)
                .setParameter("orderIds", orderIds)
                .getResultList();
        return rows.stream().map(Number::longValue).toList();
    }

    public List<Long> findOrderIdsStillActiveWithCanceledPayment(List<Long> orderIds) {
        @SuppressWarnings("unchecked")
        List<Number> rows = entityManager.createNativeQuery("""
                        SELECT o.id
                        FROM orders o
                        WHERE o.id IN (:orderIds)
                          AND o.pickup_number > 0
                          AND o.status IN ('PREPARING', 'READY')
                          AND EXISTS (
                              SELECT 1
                              FROM payments p
                              WHERE p.order_id = o.id
                                AND p.status = 'CANCELED'
                          )
                          AND NOT EXISTS (
                              SELECT 1
                              FROM payments d
                              WHERE d.order_id = o.id
                                AND d.status = 'DONE'
                          )
                        """)
                .setParameter("orderIds", orderIds)
                .getResultList();
        return rows.stream().map(Number::longValue).toList();
    }

    public List<Long> findPaymentIdsStillAmountMismatch(List<Long> paymentIds) {
        @SuppressWarnings("unchecked")
        List<Number> rows = entityManager.createNativeQuery("""
                        SELECT p.id
                        FROM payments p
                        INNER JOIN orders o ON o.id = p.order_id
                        WHERE p.id IN (:paymentIds)
                          AND p.status = 'DONE'
                          AND p.amount <> o.total_amount
                        """)
                .setParameter("paymentIds", paymentIds)
                .getResultList();
        return rows.stream().map(Number::longValue).toList();
    }

    public List<Long> findOrderIdsStillMultipleValidPayments(List<Long> orderIds) {
        @SuppressWarnings("unchecked")
        List<Number> rows = entityManager.createNativeQuery("""
                        SELECT p.order_id
                        FROM payments p
                        WHERE p.order_id IN (:orderIds)
                          AND p.status = 'DONE'
                        GROUP BY p.order_id
                        HAVING COUNT(p.id) > 1
                        """)
                .setParameter("orderIds", orderIds)
                .getResultList();
        return rows.stream().map(Number::longValue).toList();
    }

    private static Long toLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.valueOf(value.toString());
    }

    private static Integer toInteger(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        return Integer.valueOf(value.toString());
    }

    private static String toString(Object value) {
        return value == null ? null : value.toString();
    }

    private static LocalDateTime toLocalDateTime(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof LocalDateTime localDateTime) {
            return localDateTime;
        }
        if (value instanceof Timestamp timestamp) {
            return timestamp.toLocalDateTime();
        }
        return LocalDateTime.parse(value.toString().replace(' ', 'T'));
    }
}
