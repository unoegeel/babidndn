package com.gdgoc.babi_order.sales.repository;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class SalesQueryRepository {

    private final EntityManager entityManager;

    public List<DailySalesRow> findDailySales(LocalDateTime fromInclusive, LocalDateTime toExclusive) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery("""
                        SELECT CAST(p.approved_at AS DATE) AS sales_date,
                               COUNT(p.id) AS payment_count,
                               COALESCE(SUM(p.amount), 0) AS total_amount
                        FROM payments p
                        WHERE p.status = 'DONE'
                          AND p.approved_at >= :fromInclusive
                          AND p.approved_at < :toExclusive
                        GROUP BY CAST(p.approved_at AS DATE)
                        ORDER BY sales_date ASC
                        """)
                .setParameter("fromInclusive", fromInclusive)
                .setParameter("toExclusive", toExclusive)
                .getResultList();
        return rows.stream()
                .map(row -> new DailySalesRow(toLocalDate(row[0]), toLong(row[1]), toLong(row[2])))
                .toList();
    }

    public List<MenuSalesRow> findMenuSales(LocalDateTime fromInclusive, LocalDateTime toExclusive) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery("""
                        SELECT oi.menu_name_snapshot AS menu_name,
                               COALESCE(SUM(oi.quantity), 0) AS item_quantity,
                               COALESCE(SUM(oi.line_amount), 0) AS total_amount
                        FROM order_items oi
                        INNER JOIN orders o ON oi.order_id = o.id
                        INNER JOIN payments p ON p.order_id = o.id
                        WHERE p.status = 'DONE'
                          AND p.approved_at >= :fromInclusive
                          AND p.approved_at < :toExclusive
                        GROUP BY oi.menu_name_snapshot
                        ORDER BY total_amount DESC, menu_name ASC
                        """)
                .setParameter("fromInclusive", fromInclusive)
                .setParameter("toExclusive", toExclusive)
                .getResultList();
        return rows.stream()
                .map(row -> new MenuSalesRow((String) row[0], toLong(row[1]), toLong(row[2])))
                .toList();
    }

    public List<MenuSalesRow> findMenuSalesAll() {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery("""
                        SELECT oi.menu_name_snapshot AS menu_name,
                               COALESCE(SUM(oi.quantity), 0) AS item_quantity,
                               COALESCE(SUM(oi.line_amount), 0) AS total_amount
                        FROM order_items oi
                        INNER JOIN orders o ON oi.order_id = o.id
                        INNER JOIN payments p ON p.order_id = o.id
                        WHERE p.status = 'DONE'
                        GROUP BY oi.menu_name_snapshot
                        ORDER BY total_amount DESC, menu_name ASC
                        """)
                .getResultList();
        return rows.stream()
                .map(row -> new MenuSalesRow((String) row[0], toLong(row[1]), toLong(row[2])))
                .toList();
    }

    public List<HourlySalesRow> findHourlySales(LocalDateTime fromInclusive, LocalDateTime toExclusive) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery("""
                        SELECT HOUR(p.approved_at) AS sales_hour,
                               COUNT(p.id) AS order_count
                        FROM payments p
                        WHERE p.status = 'DONE'
                          AND p.approved_at >= :fromInclusive
                          AND p.approved_at < :toExclusive
                        GROUP BY HOUR(p.approved_at)
                        ORDER BY sales_hour ASC
                        """)
                .setParameter("fromInclusive", fromInclusive)
                .setParameter("toExclusive", toExclusive)
                .getResultList();
        return rows.stream()
                .map(row -> new HourlySalesRow(toInt(row[0]), toLong(row[1])))
                .toList();
    }

    public List<MonthlySalesRow> findMonthlySales() {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery("""
                        SELECT YEAR(p.approved_at) AS sales_year,
                               MONTH(p.approved_at) AS sales_month,
                               COUNT(p.id) AS payment_count,
                               COALESCE(SUM(p.amount), 0) AS total_amount
                        FROM payments p
                        WHERE p.status = 'DONE'
                        GROUP BY YEAR(p.approved_at), MONTH(p.approved_at)
                        ORDER BY sales_year ASC, sales_month ASC
                        """)
                .getResultList();
        return rows.stream()
                .map(row -> new MonthlySalesRow(toInt(row[0]), toInt(row[1]), toLong(row[2]), toLong(row[3])))
                .toList();
    }

    public List<YearlySalesRow> findYearlySales() {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery("""
                        SELECT YEAR(p.approved_at) AS sales_year,
                               COUNT(p.id) AS payment_count,
                               COALESCE(SUM(p.amount), 0) AS total_amount
                        FROM payments p
                        WHERE p.status = 'DONE'
                        GROUP BY YEAR(p.approved_at)
                        ORDER BY sales_year ASC
                        """)
                .getResultList();
        return rows.stream()
                .map(row -> new YearlySalesRow(toInt(row[0]), toLong(row[1]), toLong(row[2])))
                .toList();
    }

    private static LocalDate toLocalDate(Object value) {
        if (value instanceof LocalDate localDate) {
            return localDate;
        }
        if (value instanceof Date sqlDate) {
            return sqlDate.toLocalDate();
        }
        if (value instanceof Timestamp timestamp) {
            return timestamp.toLocalDateTime().toLocalDate();
        }
        throw new IllegalStateException("지원하지 않는 날짜 타입입니다: " + value);
    }

    private static long toLong(Object value) {
        if (value == null) {
            return 0L;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(value.toString());
    }

    private static int toInt(Object value) {
        return (int) toLong(value);
    }
}
