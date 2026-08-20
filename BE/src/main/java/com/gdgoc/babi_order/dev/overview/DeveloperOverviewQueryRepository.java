package com.gdgoc.babi_order.dev.overview;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public class DeveloperOverviewQueryRepository {

    @PersistenceContext
    private EntityManager em;

    public RequestMetricsRow requestMetrics(Instant from, Instant to) {
        String sql = """
                SELECT
                    COUNT(*)                                                          AS total,
                    COALESCE(SUM(CASE WHEN status >= 200 AND status < 300 THEN 1 ELSE 0 END), 0) AS success,
                    COALESCE(SUM(CASE WHEN status >= 400 AND status < 500 THEN 1 ELSE 0 END), 0) AS client_errors,
                    COALESCE(SUM(CASE WHEN status >= 500 THEN 1 ELSE 0 END), 0)       AS server_errors,
                    COALESCE(AVG(duration_ms), 0)                                     AS avg_duration
                FROM http_request_records
                WHERE created_at >= :from
                  AND created_at <= :to
                """;
        Object[] row = (Object[]) em.createNativeQuery(sql)
                .setParameter("from", from)
                .setParameter("to", to)
                .getSingleResult();
        return new RequestMetricsRow(
                toLong(row[0]),
                toLong(row[1]),
                toLong(row[2]),
                toLong(row[3]),
                Math.round(toDouble(row[4]))
        );
    }

    public EventMetricsRow eventMetrics(Instant from, Instant to) {
        String countSql = """
                SELECT COUNT(*)
                FROM client_events
                WHERE occurred_at >= :from
                  AND occurred_at <= :to
                """;
        long total = toLong(em.createNativeQuery(countSql)
                .setParameter("from", from)
                .setParameter("to", to)
                .getSingleResult());

        String sessionSql = """
                SELECT COUNT(DISTINCT session_id)
                FROM client_events
                WHERE occurred_at >= :from
                  AND occurred_at <= :to
                """;
        long uniqueSessions = toLong(em.createNativeQuery(sessionSql)
                .setParameter("from", from)
                .setParameter("to", to)
                .getSingleResult());

        String topSql = """
                SELECT event_type
                FROM client_events
                WHERE occurred_at >= :from
                  AND occurred_at <= :to
                GROUP BY event_type
                ORDER BY COUNT(*) DESC
                LIMIT 1
                """;
        String topEvent = null;
        var topRows = em.createNativeQuery(topSql)
                .setParameter("from", from)
                .setParameter("to", to)
                .getResultList();
        if (!topRows.isEmpty() && topRows.getFirst() != null) {
            topEvent = topRows.getFirst().toString();
        }

        return new EventMetricsRow(total, uniqueSessions, topEvent);
    }

    public Optional<Instant> maxInstant(String table, String column, Instant from, Instant to) {
        String sql = "SELECT MAX(" + column + ") FROM " + table +
                " WHERE " + column + " >= :from AND " + column + " <= :to";
        Object result = em.createNativeQuery(sql)
                .setParameter("from", from)
                .setParameter("to", to)
                .getSingleResult();
        if (result == null) {
            return Optional.empty();
        }
        if (result instanceof Instant instant) {
            return Optional.of(instant);
        }
        if (result instanceof java.sql.Timestamp timestamp) {
            return Optional.of(timestamp.toInstant());
        }
        return Optional.empty();
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

    private static double toDouble(Object value) {
        if (value == null) {
            return 0.0;
        }
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        return Double.parseDouble(value.toString());
    }

    public record RequestMetricsRow(
            long total,
            long success,
            long clientErrors,
            long serverErrors,
            long averageDurationMs
    ) {
    }

    public record EventMetricsRow(
            long total,
            long uniqueSessions,
            String topEvent
    ) {
    }
}
