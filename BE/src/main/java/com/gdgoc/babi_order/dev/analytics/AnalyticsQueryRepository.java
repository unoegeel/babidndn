package com.gdgoc.babi_order.dev.analytics;

import com.gdgoc.babi_order.dev.analytics.dto.MenuAnalyticsItem;
import com.gdgoc.babi_order.dev.analytics.dto.OptionAnalyticsItem;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Analytics 전용 DB 집계 쿼리.
 * 모두 Native SQL을 사용하여 JSON metadata 값을 DB에서 직접 추출/집계한다.
 * 전체 이벤트를 Java로 가져와 계산하지 않는다.
 */
@Repository
public class AnalyticsQueryRepository {

    @PersistenceContext
    private EntityManager em;

    // ───────────── Overview KPI ─────────────

    /** COUNT(DISTINCT anonymous_id) WHERE event_type = eventType AND occurred_at BETWEEN from AND to */
    public long countDistinctAnonymousId(String eventType, Instant from, Instant to) {
        String sql = "SELECT COUNT(DISTINCT anonymous_id) FROM client_events " +
                "WHERE event_type = :type AND occurred_at >= :from AND occurred_at <= :to";
        Query q = em.createNativeQuery(sql)
                .setParameter("type", eventType)
                .setParameter("from", from)
                .setParameter("to", to);
        Number result = (Number) q.getSingleResult();
        return result != null ? result.longValue() : 0L;
    }

    /** COUNT(*) WHERE event_type = eventType AND occurred_at BETWEEN from AND to */
    public long countEvents(String eventType, Instant from, Instant to) {
        String sql = "SELECT COUNT(*) FROM client_events " +
                "WHERE event_type = :type AND occurred_at >= :from AND occurred_at <= :to";
        Query q = em.createNativeQuery(sql)
                .setParameter("type", eventType)
                .setParameter("from", from)
                .setParameter("to", to);
        Number result = (Number) q.getSingleResult();
        return result != null ? result.longValue() : 0L;
    }

    // ───────────── Menu Analytics ─────────────

    /**
     * MENU_VIEW metadata.menuId 기준으로 views, uniqueViewers 집계 후
     * menus 테이블과 LEFT JOIN하여 menuName 획득. views DESC, 상위 limit개.
     *
     * MySQL JSON_UNQUOTE(JSON_EXTRACT(...)) 사용.
     */
    @SuppressWarnings("unchecked")
    public List<MenuAnalyticsItem> topMenusByViews(Instant from, Instant to, int limit) {
        String sql = """
                SELECT
                    CAST(JSON_UNQUOTE(JSON_EXTRACT(ce.metadata, '$.menuId')) AS UNSIGNED) AS menu_id,
                    MAX(m.name)                                                            AS menu_name,
                    COUNT(*)                                                               AS views,
                    COUNT(DISTINCT ce.anonymous_id)                                        AS unique_viewers
                FROM client_events ce
                LEFT JOIN menus m
                       ON m.id = CAST(JSON_UNQUOTE(JSON_EXTRACT(ce.metadata, '$.menuId')) AS UNSIGNED)
                WHERE ce.event_type = 'MENU_VIEW'
                  AND ce.occurred_at >= :from
                  AND ce.occurred_at <= :to
                  AND JSON_EXTRACT(ce.metadata, '$.menuId') IS NOT NULL
                GROUP BY menu_id
                ORDER BY views DESC
                LIMIT :lim
                """;
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("from", from)
                .setParameter("to", to)
                .setParameter("lim", limit)
                .getResultList();
        return toMenuItems(rows, 0);
    }

    /**
     * ADD_TO_CART metadata.menuId 기준으로 cartAdds 집계 후 menus JOIN.
     * cartAdds DESC, 상위 limit개.
     */
    @SuppressWarnings("unchecked")
    public List<MenuAnalyticsItem> topMenusByCartAdds(Instant from, Instant to, int limit) {
        String sql = """
                SELECT
                    CAST(JSON_UNQUOTE(JSON_EXTRACT(ce.metadata, '$.menuId')) AS UNSIGNED) AS menu_id,
                    MAX(m.name)                                                            AS menu_name,
                    COUNT(*)                                                               AS cart_adds
                FROM client_events ce
                LEFT JOIN menus m
                       ON m.id = CAST(JSON_UNQUOTE(JSON_EXTRACT(ce.metadata, '$.menuId')) AS UNSIGNED)
                WHERE ce.event_type = 'ADD_TO_CART'
                  AND ce.occurred_at >= :from
                  AND ce.occurred_at <= :to
                  AND JSON_EXTRACT(ce.metadata, '$.menuId') IS NOT NULL
                GROUP BY menu_id
                ORDER BY cart_adds DESC
                LIMIT :lim
                """;
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("from", from)
                .setParameter("to", to)
                .setParameter("lim", limit)
                .getResultList();
        return toCartMenuItems(rows);
    }

    // ───────────── Option Analytics ─────────────

    /**
     * OPTION_SELECTED metadata.optionId 기준으로 selectionCount, uniqueUsers 집계 후
     * menu_options LEFT JOIN하여 optionName 획득. selectionCount DESC, 상위 limit개.
     */
    @SuppressWarnings("unchecked")
    public List<OptionAnalyticsItem> topOptions(Instant from, Instant to, int limit) {
        String sql = """
                SELECT
                    CAST(JSON_UNQUOTE(JSON_EXTRACT(ce.metadata, '$.optionId')) AS UNSIGNED)   AS option_id,
                    MAX(mo.name)                                                              AS option_name,
                    JSON_UNQUOTE(JSON_EXTRACT(ce.metadata, '$.optionGroup'))                  AS option_group,
                    CAST(JSON_UNQUOTE(JSON_EXTRACT(ce.metadata, '$.menuId')) AS UNSIGNED)     AS menu_id,
                    COUNT(*)                                                                  AS selection_count,
                    COUNT(DISTINCT ce.anonymous_id)                                           AS unique_users
                FROM client_events ce
                LEFT JOIN menu_options mo
                       ON mo.id = CAST(JSON_UNQUOTE(JSON_EXTRACT(ce.metadata, '$.optionId')) AS UNSIGNED)
                WHERE ce.event_type = 'OPTION_SELECTED'
                  AND ce.occurred_at >= :from
                  AND ce.occurred_at <= :to
                  AND JSON_EXTRACT(ce.metadata, '$.optionId') IS NOT NULL
                GROUP BY option_id, option_group, menu_id
                ORDER BY selection_count DESC
                LIMIT :lim
                """;
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("from", from)
                .setParameter("to", to)
                .setParameter("lim", limit)
                .getResultList();

        List<OptionAnalyticsItem> result = new ArrayList<>(rows.size());
        for (Object[] row : rows) {
            long optionId = toLong(row[0]);
            String optionName = row[1] != null ? row[1].toString() : "삭제된 옵션";
            String optionGroup = row[2] != null ? row[2].toString() : null;
            long menuId = toLong(row[3]);
            long selectionCount = toLong(row[4]);
            long uniqueUsers = toLong(row[5]);
            result.add(OptionAnalyticsItem.builder()
                    .optionId(optionId)
                    .optionName(optionName)
                    .optionGroup(optionGroup)
                    .menuId(menuId)
                    .selectionCount(selectionCount)
                    .uniqueUsers(uniqueUsers)
                    .build());
        }
        return result;
    }

    // ───────────── helpers ─────────────

    private List<MenuAnalyticsItem> toMenuItems(List<Object[]> rows, int cartAddsColOffset) {
        List<MenuAnalyticsItem> result = new ArrayList<>(rows.size());
        for (Object[] row : rows) {
            long menuId = toLong(row[0]);
            String menuName = row[1] != null ? row[1].toString() : "삭제된 메뉴";
            long views = toLong(row[2]);
            long uniqueViewers = toLong(row[3]);
            result.add(MenuAnalyticsItem.builder()
                    .menuId(menuId)
                    .menuName(menuName)
                    .views(views)
                    .uniqueViewers(uniqueViewers)
                    .cartAdds(0L)
                    .build());
        }
        return result;
    }

    private List<MenuAnalyticsItem> toCartMenuItems(List<Object[]> rows) {
        List<MenuAnalyticsItem> result = new ArrayList<>(rows.size());
        for (Object[] row : rows) {
            long menuId = toLong(row[0]);
            String menuName = row[1] != null ? row[1].toString() : "삭제된 메뉴";
            long cartAdds = toLong(row[2]);
            result.add(MenuAnalyticsItem.builder()
                    .menuId(menuId)
                    .menuName(menuName)
                    .views(0L)
                    .uniqueViewers(0L)
                    .cartAdds(cartAdds)
                    .build());
        }
        return result;
    }

    private static long toLong(Object value) {
        if (value == null) return 0L;
        if (value instanceof Number) return ((Number) value).longValue();
        try {
            return Long.parseLong(value.toString());
        } catch (NumberFormatException e) {
            return 0L;
        }
    }
}
