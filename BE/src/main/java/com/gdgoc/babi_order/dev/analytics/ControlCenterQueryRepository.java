package com.gdgoc.babi_order.dev.analytics;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Repository
public class ControlCenterQueryRepository {

    @PersistenceContext
    private EntityManager em;

    // ── Processing time (seconds): called_at - pickup_assigned_at ──

    @SuppressWarnings("unchecked")
    public List<Long> processingDurationsSeconds(LocalDateTime fromInclusive, LocalDateTime toExclusive) {
        List<Object> rows = em.createNativeQuery("""
                        SELECT TIMESTAMPDIFF(SECOND, o.pickup_assigned_at, o.called_at)
                        FROM orders o
                        WHERE o.pickup_assigned_at IS NOT NULL
                          AND o.called_at IS NOT NULL
                          AND o.pickup_assigned_at >= :fromInclusive
                          AND o.pickup_assigned_at < :toExclusive
                          AND o.called_at >= o.pickup_assigned_at
                        """)
                .setParameter("fromInclusive", fromInclusive)
                .setParameter("toExclusive", toExclusive)
                .getResultList();
        List<Long> out = new ArrayList<>(rows.size());
        for (Object row : rows) {
            if (row instanceof Number n) {
                out.add(n.longValue());
            }
        }
        return out;
    }

    @SuppressWarnings("unchecked")
    public List<HourlyAvgSeconds> processingByHour(LocalDateTime fromInclusive, LocalDateTime toExclusive) {
        List<Object[]> rows = em.createNativeQuery("""
                        SELECT HOUR(o.pickup_assigned_at) AS h,
                               AVG(TIMESTAMPDIFF(SECOND, o.pickup_assigned_at, o.called_at)) AS avg_sec,
                               COUNT(*) AS sample_count
                        FROM orders o
                        WHERE o.pickup_assigned_at IS NOT NULL
                          AND o.called_at IS NOT NULL
                          AND o.pickup_assigned_at >= :fromInclusive
                          AND o.pickup_assigned_at < :toExclusive
                          AND o.called_at >= o.pickup_assigned_at
                        GROUP BY HOUR(o.pickup_assigned_at)
                        ORDER BY h ASC
                        """)
                .setParameter("fromInclusive", fromInclusive)
                .setParameter("toExclusive", toExclusive)
                .getResultList();
        return rows.stream()
                .map(r -> new HourlyAvgSeconds(toInt(r[0]), toDouble(r[1]), toLong(r[2])))
                .toList();
    }

    public long countSlowProcessing(LocalDateTime fromInclusive, LocalDateTime toExclusive, long thresholdSeconds) {
        Number n = (Number) em.createNativeQuery("""
                        SELECT COUNT(*) FROM orders o
                        WHERE o.pickup_assigned_at IS NOT NULL
                          AND o.called_at IS NOT NULL
                          AND o.pickup_assigned_at >= :fromInclusive
                          AND o.pickup_assigned_at < :toExclusive
                          AND TIMESTAMPDIFF(SECOND, o.pickup_assigned_at, o.called_at) >= :threshold
                        """)
                .setParameter("fromInclusive", fromInclusive)
                .setParameter("toExclusive", toExclusive)
                .setParameter("threshold", thresholdSeconds)
                .getSingleResult();
        return n == null ? 0L : n.longValue();
    }

    // ── Queue ops ──

    public long countActiveQueueToday(LocalDateTime dayStart, LocalDateTime dayEnd, String status) {
        Number n = (Number) em.createNativeQuery("""
                        SELECT COUNT(*) FROM orders o
                        WHERE o.status = :status
                          AND o.pickup_assigned_at IS NOT NULL
                          AND o.pickup_assigned_at >= :dayStart
                          AND o.pickup_assigned_at < :dayEnd
                        """)
                .setParameter("status", status)
                .setParameter("dayStart", dayStart)
                .setParameter("dayEnd", dayEnd)
                .getSingleResult();
        return n == null ? 0L : n.longValue();
    }

    @SuppressWarnings("unchecked")
    public List<HourlyCount> queueEntriesByHour(LocalDateTime fromInclusive, LocalDateTime toExclusive) {
        List<Object[]> rows = em.createNativeQuery("""
                        SELECT HOUR(o.pickup_assigned_at) AS h, COUNT(*) AS cnt
                        FROM orders o
                        WHERE o.pickup_assigned_at IS NOT NULL
                          AND o.pickup_assigned_at >= :fromInclusive
                          AND o.pickup_assigned_at < :toExclusive
                        GROUP BY HOUR(o.pickup_assigned_at)
                        ORDER BY h ASC
                        """)
                .setParameter("fromInclusive", fromInclusive)
                .setParameter("toExclusive", toExclusive)
                .getResultList();
        return rows.stream().map(r -> new HourlyCount(toInt(r[0]), toLong(r[1]))).toList();
    }

    // ── HTTP performance ──

    public long countHttpRequests(Instant from, Instant to) {
        Number n = (Number) em.createNativeQuery("""
                        SELECT COUNT(*) FROM http_request_records
                        WHERE created_at >= :from AND created_at <= :to
                        """)
                .setParameter("from", from)
                .setParameter("to", to)
                .getSingleResult();
        return n == null ? 0L : n.longValue();
    }

    public long countHttpByStatusRange(Instant from, Instant to, int minStatus, int maxStatusExclusive) {
        Number n = (Number) em.createNativeQuery("""
                        SELECT COUNT(*) FROM http_request_records
                        WHERE created_at >= :from AND created_at <= :to
                          AND status >= :minStatus AND status < :maxStatus
                        """)
                .setParameter("from", from)
                .setParameter("to", to)
                .setParameter("minStatus", minStatus)
                .setParameter("maxStatus", maxStatusExclusive)
                .getSingleResult();
        return n == null ? 0L : n.longValue();
    }

    @SuppressWarnings("unchecked")
    public List<Long> httpDurationsMs(Instant from, Instant to) {
        List<Object> rows = em.createNativeQuery("""
                        SELECT duration_ms FROM http_request_records
                        WHERE created_at >= :from AND created_at <= :to
                          AND duration_ms IS NOT NULL
                        """)
                .setParameter("from", from)
                .setParameter("to", to)
                .getResultList();
        List<Long> out = new ArrayList<>(rows.size());
        for (Object row : rows) {
            if (row instanceof Number n) {
                out.add(n.longValue());
            }
        }
        return out;
    }

    @SuppressWarnings("unchecked")
    public List<EndpointPerfRow> endpointPerformance(Instant from, Instant to, int limit) {
        List<Object[]> rows = em.createNativeQuery("""
                        SELECT path,
                               COUNT(*) AS req_count,
                               AVG(duration_ms) AS avg_ms,
                               SUM(CASE WHEN status >= 500 AND status < 600 THEN 1 ELSE 0 END) AS s5xx
                        FROM http_request_records
                        WHERE created_at >= :from AND created_at <= :to
                        GROUP BY path
                        ORDER BY req_count DESC
                        LIMIT :lim
                        """)
                .setParameter("from", from)
                .setParameter("to", to)
                .setParameter("lim", limit)
                .getResultList();
        List<EndpointPerfRow> result = new ArrayList<>();
        for (Object[] r : rows) {
            String path = (String) r[0];
            long count = toLong(r[1]);
            double avg = toDouble(r[2]);
            long s5xx = toLong(r[3]);
            Long p95 = pathP95(path, from, to);
            result.add(new EndpointPerfRow(path, count, avg, p95 == null ? 0L : p95, s5xx));
        }
        return result;
    }

    @SuppressWarnings("unchecked")
    private Long pathP95(String path, Instant from, Instant to) {
        List<Object> rows = em.createNativeQuery("""
                        SELECT duration_ms FROM http_request_records
                        WHERE created_at >= :from AND created_at <= :to
                          AND path = :path AND duration_ms IS NOT NULL
                        """)
                .setParameter("from", from)
                .setParameter("to", to)
                .setParameter("path", path)
                .getResultList();
        List<Long> ms = new ArrayList<>(rows.size());
        for (Object row : rows) {
            if (row instanceof Number n) {
                ms.add(n.longValue());
            }
        }
        return percentile(ms, 0.95);
    }

    @SuppressWarnings("unchecked")
    public List<HourlyCount> httpRequestsByHour(Instant from, Instant to) {
        // MySQL: convert Instant to datetime in session TZ (Asia/Seoul)
        List<Object[]> rows = em.createNativeQuery("""
                        SELECT HOUR(created_at) AS h, COUNT(*) AS cnt
                        FROM http_request_records
                        WHERE created_at >= :from AND created_at <= :to
                        GROUP BY HOUR(created_at)
                        ORDER BY h ASC
                        """)
                .setParameter("from", from)
                .setParameter("to", to)
                .getResultList();
        return rows.stream().map(r -> new HourlyCount(toInt(r[0]), toLong(r[1]))).toList();
    }

    // ── Reliability ──

    public long countClientErrors(Instant from, Instant to) {
        Number n = (Number) em.createNativeQuery("""
                        SELECT COUNT(*) FROM client_errors
                        WHERE created_at >= :from AND created_at <= :to
                        """)
                .setParameter("from", from)
                .setParameter("to", to)
                .getSingleResult();
        return n == null ? 0L : n.longValue();
    }

    public long countBackendErrors(Instant from, Instant to) {
        Number n = (Number) em.createNativeQuery("""
                        SELECT COUNT(*) FROM backend_errors
                        WHERE created_at >= :from AND created_at <= :to
                        """)
                .setParameter("from", from)
                .setParameter("to", to)
                .getSingleResult();
        return n == null ? 0L : n.longValue();
    }

    @SuppressWarnings("unchecked")
    public List<NamedCount> topClientErrorSources(Instant from, Instant to, int limit) {
        List<Object[]> rows = em.createNativeQuery("""
                        SELECT source, COUNT(*) AS cnt FROM client_errors
                        WHERE created_at >= :from AND created_at <= :to
                        GROUP BY source ORDER BY cnt DESC LIMIT :lim
                        """)
                .setParameter("from", from)
                .setParameter("to", to)
                .setParameter("lim", limit)
                .getResultList();
        return rows.stream().map(r -> new NamedCount(String.valueOf(r[0]), toLong(r[1]))).toList();
    }

    @SuppressWarnings("unchecked")
    public List<NamedCount> topClientErrorRoutes(Instant from, Instant to, int limit) {
        List<Object[]> rows = em.createNativeQuery("""
                        SELECT route, COUNT(*) AS cnt FROM client_errors
                        WHERE created_at >= :from AND created_at <= :to
                        GROUP BY route ORDER BY cnt DESC LIMIT :lim
                        """)
                .setParameter("from", from)
                .setParameter("to", to)
                .setParameter("lim", limit)
                .getResultList();
        return rows.stream().map(r -> new NamedCount(String.valueOf(r[0]), toLong(r[1]))).toList();
    }

    @SuppressWarnings("unchecked")
    public List<NamedCount> topBackendExceptions(Instant from, Instant to, int limit) {
        List<Object[]> rows = em.createNativeQuery("""
                        SELECT exception_class, COUNT(*) AS cnt FROM backend_errors
                        WHERE created_at >= :from AND created_at <= :to
                        GROUP BY exception_class ORDER BY cnt DESC LIMIT :lim
                        """)
                .setParameter("from", from)
                .setParameter("to", to)
                .setParameter("lim", limit)
                .getResultList();
        return rows.stream().map(r -> new NamedCount(String.valueOf(r[0]), toLong(r[1]))).toList();
    }

    @SuppressWarnings("unchecked")
    public List<NamedCount> topBackendPaths(Instant from, Instant to, int limit) {
        List<Object[]> rows = em.createNativeQuery("""
                        SELECT path, COUNT(*) AS cnt FROM backend_errors
                        WHERE created_at >= :from AND created_at <= :to
                        GROUP BY path ORDER BY cnt DESC LIMIT :lim
                        """)
                .setParameter("from", from)
                .setParameter("to", to)
                .setParameter("lim", limit)
                .getResultList();
        return rows.stream().map(r -> new NamedCount(String.valueOf(r[0]), toLong(r[1]))).toList();
    }

    // ── Session sequential funnel (MENU → CART → CHECKOUT → PAYMENT_START) ──

    public long countSequentialSessions(Instant from, Instant to) {
        Number n = (Number) em.createNativeQuery("""
                        SELECT COUNT(*) FROM (
                          SELECT s.session_id
                          FROM (
                            SELECT session_id,
                                   MIN(CASE WHEN event_type = 'MENU_VIEW' THEN occurred_at END) AS t_menu,
                                   MIN(CASE WHEN event_type = 'ADD_TO_CART' THEN occurred_at END) AS t_cart,
                                   MIN(CASE WHEN event_type = 'CHECKOUT_VIEW' THEN occurred_at END) AS t_checkout,
                                   MIN(CASE WHEN event_type = 'PAYMENT_START' THEN occurred_at END) AS t_pay
                            FROM client_events
                            WHERE occurred_at >= :from AND occurred_at <= :to
                              AND event_type IN ('MENU_VIEW','ADD_TO_CART','CHECKOUT_VIEW','PAYMENT_START')
                            GROUP BY session_id
                          ) s
                          WHERE s.t_menu IS NOT NULL
                            AND s.t_cart IS NOT NULL AND s.t_cart >= s.t_menu
                            AND s.t_checkout IS NOT NULL AND s.t_checkout >= s.t_cart
                            AND s.t_pay IS NOT NULL AND s.t_pay >= s.t_checkout
                        ) x
                        """)
                .setParameter("from", from)
                .setParameter("to", to)
                .getSingleResult();
        return n == null ? 0L : n.longValue();
    }

    public long countSessionsReaching(Instant from, Instant to, String lastEventInclusive) {
        // sessions that have ordered timestamps through lastEventInclusive
        String sql = switch (lastEventInclusive) {
            case "MENU_VIEW" -> """
                    SELECT COUNT(DISTINCT session_id) FROM client_events
                    WHERE occurred_at >= :from AND occurred_at <= :to AND event_type = 'MENU_VIEW'
                    """;
            case "ADD_TO_CART" -> """
                    SELECT COUNT(*) FROM (
                      SELECT session_id,
                             MIN(CASE WHEN event_type = 'MENU_VIEW' THEN occurred_at END) AS t_menu,
                             MIN(CASE WHEN event_type = 'ADD_TO_CART' THEN occurred_at END) AS t_cart
                      FROM client_events
                      WHERE occurred_at >= :from AND occurred_at <= :to
                        AND event_type IN ('MENU_VIEW','ADD_TO_CART')
                      GROUP BY session_id
                    ) s WHERE s.t_menu IS NOT NULL AND s.t_cart IS NOT NULL AND s.t_cart >= s.t_menu
                    """;
            case "CHECKOUT_VIEW" -> """
                    SELECT COUNT(*) FROM (
                      SELECT session_id,
                             MIN(CASE WHEN event_type = 'MENU_VIEW' THEN occurred_at END) AS t_menu,
                             MIN(CASE WHEN event_type = 'ADD_TO_CART' THEN occurred_at END) AS t_cart,
                             MIN(CASE WHEN event_type = 'CHECKOUT_VIEW' THEN occurred_at END) AS t_checkout
                      FROM client_events
                      WHERE occurred_at >= :from AND occurred_at <= :to
                        AND event_type IN ('MENU_VIEW','ADD_TO_CART','CHECKOUT_VIEW')
                      GROUP BY session_id
                    ) s WHERE s.t_menu IS NOT NULL AND s.t_cart IS NOT NULL AND s.t_cart >= s.t_menu
                      AND s.t_checkout IS NOT NULL AND s.t_checkout >= s.t_cart
                    """;
            case "PAYMENT_START" -> """
                    SELECT COUNT(*) FROM (
                      SELECT session_id,
                             MIN(CASE WHEN event_type = 'MENU_VIEW' THEN occurred_at END) AS t_menu,
                             MIN(CASE WHEN event_type = 'ADD_TO_CART' THEN occurred_at END) AS t_cart,
                             MIN(CASE WHEN event_type = 'CHECKOUT_VIEW' THEN occurred_at END) AS t_checkout,
                             MIN(CASE WHEN event_type = 'PAYMENT_START' THEN occurred_at END) AS t_pay
                      FROM client_events
                      WHERE occurred_at >= :from AND occurred_at <= :to
                        AND event_type IN ('MENU_VIEW','ADD_TO_CART','CHECKOUT_VIEW','PAYMENT_START')
                      GROUP BY session_id
                    ) s WHERE s.t_menu IS NOT NULL AND s.t_cart IS NOT NULL AND s.t_cart >= s.t_menu
                      AND s.t_checkout IS NOT NULL AND s.t_checkout >= s.t_cart
                      AND s.t_pay IS NOT NULL AND s.t_pay >= s.t_checkout
                    """;
            default -> throw new IllegalArgumentException(lastEventInclusive);
        };
        Number n = (Number) em.createNativeQuery(sql)
                .setParameter("from", from)
                .setParameter("to", to)
                .getSingleResult();
        return n == null ? 0L : n.longValue();
    }

    public long countDistinctSessions(String eventType, Instant from, Instant to) {
        Number n = (Number) em.createNativeQuery("""
                        SELECT COUNT(DISTINCT session_id) FROM client_events
                        WHERE event_type = :type AND occurred_at >= :from AND occurred_at <= :to
                        """)
                .setParameter("type", eventType)
                .setParameter("from", from)
                .setParameter("to", to)
                .getSingleResult();
        return n == null ? 0L : n.longValue();
    }

    // ── Menu behavior counts by menuId ──

    @SuppressWarnings("unchecked")
    public List<MenuBehaviorRow> menuBehavior(Instant from, Instant to) {
        List<Object[]> viewRows = em.createNativeQuery("""
                        SELECT CAST(JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.menuId')) AS UNSIGNED) AS menu_id,
                               COUNT(*) AS views
                        FROM client_events
                        WHERE event_type = 'MENU_VIEW'
                          AND occurred_at >= :from AND occurred_at <= :to
                          AND JSON_EXTRACT(metadata, '$.menuId') IS NOT NULL
                        GROUP BY menu_id
                        """)
                .setParameter("from", from)
                .setParameter("to", to)
                .getResultList();
        List<Object[]> cartRows = em.createNativeQuery("""
                        SELECT CAST(JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.menuId')) AS UNSIGNED) AS menu_id,
                               COUNT(*) AS carts
                        FROM client_events
                        WHERE event_type = 'ADD_TO_CART'
                          AND occurred_at >= :from AND occurred_at <= :to
                          AND JSON_EXTRACT(metadata, '$.menuId') IS NOT NULL
                        GROUP BY menu_id
                        """)
                .setParameter("from", from)
                .setParameter("to", to)
                .getResultList();
        java.util.Map<Long, long[]> map = new java.util.HashMap<>();
        for (Object[] r : viewRows) {
            long id = toLong(r[0]);
            map.computeIfAbsent(id, k -> new long[2])[0] = toLong(r[1]);
        }
        for (Object[] r : cartRows) {
            long id = toLong(r[0]);
            map.computeIfAbsent(id, k -> new long[2])[1] = toLong(r[1]);
        }
        List<MenuBehaviorRow> out = new ArrayList<>();
        for (var e : map.entrySet()) {
            out.add(new MenuBehaviorRow(e.getKey(), e.getValue()[0], e.getValue()[1]));
        }
        return out;
    }

    public static Long percentile(List<Long> sortedOrUnsorted, double p) {
        if (sortedOrUnsorted == null || sortedOrUnsorted.isEmpty()) {
            return null;
        }
        List<Long> sorted = new ArrayList<>(sortedOrUnsorted);
        sorted.sort(Comparator.naturalOrder());
        int idx = (int) Math.ceil(p * sorted.size()) - 1;
        idx = Math.max(0, Math.min(sorted.size() - 1, idx));
        return sorted.get(idx);
    }

    public static double average(List<Long> values) {
        if (values == null || values.isEmpty()) {
            return 0.0;
        }
        long sum = 0;
        for (Long v : values) {
            sum += v;
        }
        return (double) sum / values.size();
    }

    private static long toLong(Object v) {
        if (v == null) return 0L;
        if (v instanceof Number n) return n.longValue();
        return Long.parseLong(v.toString());
    }

    private static int toInt(Object v) {
        return (int) toLong(v);
    }

    private static double toDouble(Object v) {
        if (v == null) return 0.0;
        if (v instanceof BigDecimal bd) return bd.doubleValue();
        if (v instanceof Number n) return n.doubleValue();
        return Double.parseDouble(v.toString());
    }

    public record HourlyAvgSeconds(int hour, double avgSeconds, long sampleCount) {
    }

    public record HourlyCount(int hour, long count) {
    }

    public record EndpointPerfRow(String path, long requestCount, double avgMs, long p95Ms, long status5xx) {
    }

    public record NamedCount(String name, long count) {
    }

    public record MenuBehaviorRow(long menuId, long views, long cartAdds) {
    }
}
