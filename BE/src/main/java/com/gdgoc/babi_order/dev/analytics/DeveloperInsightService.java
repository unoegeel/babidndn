package com.gdgoc.babi_order.dev.analytics;

import com.gdgoc.babi_order.clientevent.ClientEventType;
import com.gdgoc.babi_order.dev.analytics.dto.AnalyticsPeriod;
import com.gdgoc.babi_order.dev.analytics.dto.ControlCenterInsightsResponse;
import com.gdgoc.babi_order.payment.reconciliation.ReconciliationIssueStatus;
import com.gdgoc.babi_order.payment.reconciliation.repository.PaymentReconciliationIssueRepository;
import com.gdgoc.babi_order.sales.repository.HourlyRevenueRow;
import com.gdgoc.babi_order.sales.repository.SalesQueryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Deterministic rule-based insights. No LLM.
 * Thresholds centralized here.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DeveloperInsightService {

    static final int MIN_ORDERS_FOR_PEAK = 10;
    static final double PEAK_SHARE_THRESHOLD = 0.40;
    static final int MIN_FUNNEL_BASE = 20;
    static final double FUNNEL_DROP_THRESHOLD = 50.0;
    static final int MIN_MENU_VIEWS = 20;
    static final double LOW_PURCHASE_RATE = 5.0;
    static final int MIN_PAYMENT_STARTS = 10;
    static final double PAYMENT_FAIL_RATE = 25.0;
    static final int MIN_HTTP_REQUESTS = 50;
    static final long P95_LATENCY_MS = 2000;
    static final double RATE_5XX = 2.0;
    static final int MIN_PROC_SAMPLES = 5;
    static final double PROC_PEAK_MULTIPLIER = 1.5;
    static final long SLOW_SECONDS = 600;

    private final AnalyticsQueryRepository eventQuery;
    private final ControlCenterQueryRepository opsQuery;
    private final SalesQueryRepository salesQuery;
    private final PaymentReconciliationIssueRepository reconciliationIssueRepository;

    public ControlCenterInsightsResponse generate(AnalyticsRange range) {
        List<ControlCenterInsightsResponse.InsightItem> items = new ArrayList<>();
        Instant now = Instant.now();

        peakOrders(range, items, now);
        funnelDrop(range, items, now);
        highViewLowPurchase(range, items, now);
        paymentFail(range, items, now);
        apiLatency(range, items, now);
        http5xx(range, items, now);
        clientErrors(range, items, now);
        backendErrors(range, items, now);
        processingDegradation(range, items, now);
        reconciliation(items, now);

        return ControlCenterInsightsResponse.builder()
                .period(AnalyticsPeriod.builder().from(range.fromInstant()).to(range.toInstant()).build())
                .insights(items)
                .build();
    }

    private void peakOrders(AnalyticsRange range, List<ControlCenterInsightsResponse.InsightItem> items, Instant now) {
        List<HourlyRevenueRow> hourly = salesQuery.findHourlyRevenue(range.fromLdtInclusive(), range.toLdtExclusive());
        long total = hourly.stream().mapToLong(HourlyRevenueRow::orderCount).sum();
        if (total < MIN_ORDERS_FOR_PEAK || hourly.isEmpty()) {
            return;
        }
        HourlyRevenueRow peak = hourly.stream().max((a, b) -> Long.compare(a.orderCount(), b.orderCount())).orElse(null);
        if (peak == null) {
            return;
        }
        double share = (double) peak.orderCount() / total;
        if (share < PEAK_SHARE_THRESHOLD) {
            return;
        }
        Map<String, Object> evidence = new LinkedHashMap<>();
        evidence.put("totalOrders", total);
        evidence.put("peakOrders", peak.orderCount());
        evidence.put("peakRange", String.format("%02d:00-%02d:00", peak.hour(), peak.hour() + 1));
        evidence.put("peakSharePercent", Math.round(share * 1000.0) / 10.0);
        items.add(item("PEAK_ORDER_CONCENTRATION", "WARNING",
                "주문 시간대 집중",
                String.format("%02d~%02d시에 전체 결제의 %.0f%%가 집중됨", peak.hour(), peak.hour() + 1, share * 100),
                "paid_orders_by_hour", evidence, now));
    }

    private void funnelDrop(AnalyticsRange range, List<ControlCenterInsightsResponse.InsightItem> items, Instant now) {
        Instant from = range.fromInstant();
        Instant to = range.toInstant();
        long menu = eventQuery.countDistinctAnonymousId(ClientEventType.MENU_VIEW.name(), from, to);
        long cart = eventQuery.countDistinctAnonymousId(ClientEventType.ADD_TO_CART.name(), from, to);
        if (menu < MIN_FUNNEL_BASE) {
            return;
        }
        double drop = (1.0 - (double) cart / menu) * 100.0;
        if (drop < FUNNEL_DROP_THRESHOLD) {
            return;
        }
        Map<String, Object> evidence = new LinkedHashMap<>();
        evidence.put("menuUnique", menu);
        evidence.put("cartUnique", cart);
        evidence.put("dropOffPercent", Math.round(drop * 10.0) / 10.0);
        items.add(item("FUNNEL_DROP", "WARNING",
                "메뉴→장바구니 이탈 큼",
                String.format("MENU_VIEW 대비 ADD_TO_CART 이탈 %.0f%%", drop),
                "anonymous_funnel", evidence, now));
    }

    private void highViewLowPurchase(AnalyticsRange range, List<ControlCenterInsightsResponse.InsightItem> items, Instant now) {
        Instant from = range.fromInstant();
        Instant to = range.toInstant();
        var behavior = opsQuery.menuBehavior(from, to);
        var paid = salesQuery.findMenuPaidSales(range.fromLdtInclusive(), range.toLdtExclusive());
        Map<Long, Long> paidOrders = new HashMapCompat();
        for (var p : paid) {
            if (p.menuId() != null) {
                paidOrders.put(p.menuId(), p.paidOrderCount());
            }
        }
        for (var b : behavior) {
            if (b.views() < MIN_MENU_VIEWS) {
                continue;
            }
            long orders = paidOrders.getOrDefault(b.menuId(), 0L);
            double rate = (double) orders / b.views() * 100.0;
            if (rate > LOW_PURCHASE_RATE) {
                continue;
            }
            Map<String, Object> evidence = new LinkedHashMap<>();
            evidence.put("menuId", b.menuId());
            evidence.put("views", b.views());
            evidence.put("paidOrders", orders);
            evidence.put("viewToPurchasePercent", Math.round(rate * 10.0) / 10.0);
            items.add(item("HIGH_VIEW_LOW_PURCHASE", "INFO",
                    "조회 대비 구매 저조 메뉴",
                    String.format("menuId=%d views=%d purchaseRate=%.1f%%", b.menuId(), b.views(), rate),
                    "menu_view_to_purchase", evidence, now));
            break; // one sample insight to limit noise
        }
    }

    private void paymentFail(AnalyticsRange range, List<ControlCenterInsightsResponse.InsightItem> items, Instant now) {
        Instant from = range.fromInstant();
        Instant to = range.toInstant();
        long starts = eventQuery.countEvents(ClientEventType.PAYMENT_START.name(), from, to);
        long fails = eventQuery.countEvents(ClientEventType.PAYMENT_FAIL.name(), from, to);
        if (starts < MIN_PAYMENT_STARTS) {
            return;
        }
        double rate = (double) fails / starts * 100.0;
        if (rate < PAYMENT_FAIL_RATE) {
            return;
        }
        Map<String, Object> evidence = new LinkedHashMap<>();
        evidence.put("paymentStarts", starts);
        evidence.put("paymentFails", fails);
        evidence.put("failRatePercent", Math.round(rate * 10.0) / 10.0);
        items.add(item("PAYMENT_FAILURE_SPIKE", "CRITICAL",
                "결제 실패 행동 비율 높음",
                String.format("PAYMENT_START 대비 FAIL %.0f%% (행동 지표, DONE 건수와 별개)", rate),
                "payment_behavior_fail_rate", evidence, now));
    }

    private void apiLatency(AnalyticsRange range, List<ControlCenterInsightsResponse.InsightItem> items, Instant now) {
        Instant from = range.fromInstant();
        Instant to = range.toInstant();
        long req = opsQuery.countHttpRequests(from, to);
        if (req < MIN_HTTP_REQUESTS) {
            return;
        }
        Long p95 = ControlCenterQueryRepository.percentile(opsQuery.httpDurationsMs(from, to), 0.95);
        if (p95 == null || p95 < P95_LATENCY_MS) {
            return;
        }
        Map<String, Object> evidence = new LinkedHashMap<>();
        evidence.put("requests", req);
        evidence.put("p95Ms", p95);
        evidence.put("thresholdMs", P95_LATENCY_MS);
        items.add(item("API_LATENCY_DEGRADATION", "WARNING",
                "API p95 지연",
                String.format("기간 p95=%dms (임계 %dms)", p95, P95_LATENCY_MS),
                "http_p95_ms", evidence, now));
    }

    private void http5xx(AnalyticsRange range, List<ControlCenterInsightsResponse.InsightItem> items, Instant now) {
        Instant from = range.fromInstant();
        Instant to = range.toInstant();
        long req = opsQuery.countHttpRequests(from, to);
        if (req < MIN_HTTP_REQUESTS) {
            return;
        }
        long s5 = opsQuery.countHttpByStatusRange(from, to, 500, 600);
        double rate = (double) s5 / req * 100.0;
        if (rate < RATE_5XX) {
            return;
        }
        Map<String, Object> evidence = new LinkedHashMap<>();
        evidence.put("requests", req);
        evidence.put("status5xx", s5);
        evidence.put("ratePercent", Math.round(rate * 10.0) / 10.0);
        items.add(item("HTTP_5XX_SPIKE", "CRITICAL",
                "HTTP 5xx 비율 상승",
                String.format("5xx %.1f%% (%d/%d)", rate, s5, req),
                "http_5xx_rate", evidence, now));
    }

    private void clientErrors(AnalyticsRange range, List<ControlCenterInsightsResponse.InsightItem> items, Instant now) {
        Instant from = range.fromInstant();
        Instant to = range.toInstant();
        long req = opsQuery.countHttpRequests(from, to);
        long err = opsQuery.countClientErrors(from, to);
        if (req < MIN_HTTP_REQUESTS || err < 10) {
            return;
        }
        double per1k = (double) err / req * 1000.0;
        if (per1k < 5.0) {
            return;
        }
        Map<String, Object> evidence = new LinkedHashMap<>();
        evidence.put("clientErrors", err);
        evidence.put("requests", req);
        evidence.put("per1kRequests", Math.round(per1k * 10.0) / 10.0);
        items.add(item("CLIENT_ERROR_SPIKE", "WARNING",
                "클라이언트 오류 비중",
                String.format("client_errors %.1f / 1k requests", per1k),
                "client_error_per_1k", evidence, now));
    }

    private void backendErrors(AnalyticsRange range, List<ControlCenterInsightsResponse.InsightItem> items, Instant now) {
        Instant from = range.fromInstant();
        Instant to = range.toInstant();
        long req = opsQuery.countHttpRequests(from, to);
        long err = opsQuery.countBackendErrors(from, to);
        if (req < MIN_HTTP_REQUESTS || err < 5) {
            return;
        }
        double per1k = (double) err / req * 1000.0;
        if (per1k < 2.0) {
            return;
        }
        Map<String, Object> evidence = new LinkedHashMap<>();
        evidence.put("backendErrors", err);
        evidence.put("requests", req);
        evidence.put("per1kRequests", Math.round(per1k * 10.0) / 10.0);
        items.add(item("BACKEND_ERROR_SPIKE", "CRITICAL",
                "백엔드 오류 비중",
                String.format("backend_errors %.1f / 1k requests", per1k),
                "backend_error_per_1k", evidence, now));
    }

    private void processingDegradation(AnalyticsRange range, List<ControlCenterInsightsResponse.InsightItem> items, Instant now) {
        List<Long> all = opsQuery.processingDurationsSeconds(range.fromLdtInclusive(), range.toLdtExclusive());
        if (all.size() < MIN_PROC_SAMPLES) {
            return;
        }
        double avg = ControlCenterQueryRepository.average(all);
        var byHour = opsQuery.processingByHour(range.fromLdtInclusive(), range.toLdtExclusive());
        for (var h : byHour) {
            if (h.sampleCount() < MIN_PROC_SAMPLES) {
                continue;
            }
            if (h.avgSeconds() < avg * PROC_PEAK_MULTIPLIER) {
                continue;
            }
            Map<String, Object> evidence = new LinkedHashMap<>();
            evidence.put("hour", h.hour());
            evidence.put("hourAvgSeconds", Math.round(h.avgSeconds() * 10.0) / 10.0);
            evidence.put("periodAvgSeconds", Math.round(avg * 10.0) / 10.0);
            evidence.put("sampleCount", h.sampleCount());
            items.add(item("PROCESSING_TIME_DEGRADATION", "WARNING",
                    "피크 시간 처리시간 증가",
                    String.format("%02d시 평균 처리 %.0fs (기간 평균 %.0fs)", h.hour(), h.avgSeconds(), avg),
                    "processing_seconds", evidence, now));
            break;
        }
        long slow = opsQuery.countSlowProcessing(range.fromLdtInclusive(), range.toLdtExclusive(), SLOW_SECONDS);
        if (slow > 0) {
            Map<String, Object> evidence = new LinkedHashMap<>();
            evidence.put("slowOrders", slow);
            evidence.put("thresholdSeconds", SLOW_SECONDS);
            evidence.put("sampleCount", all.size());
            items.add(item("PROCESSING_TIME_DEGRADATION", "INFO",
                    "장기 처리 주문",
                    String.format("%d건이 %d초 이상 (calledAt-pickupAssignedAt)", slow, SLOW_SECONDS),
                    "slow_processing_count", evidence, now));
        }
    }

    private void reconciliation(List<ControlCenterInsightsResponse.InsightItem> items, Instant now) {
        long open = reconciliationIssueRepository.countByStatus(ReconciliationIssueStatus.OPEN);
        if (open <= 0) {
            return;
        }
        Map<String, Object> evidence = new LinkedHashMap<>();
        evidence.put("openCount", open);
        items.add(item("RECONCILIATION_ISSUE", "WARNING",
                "미해결 결제 정합성 이슈",
                open + "건 OPEN — /dev/reconciliation 확인",
                "reconciliation_open", evidence, now));
    }

    private static ControlCenterInsightsResponse.InsightItem item(
            String type, String severity, String title, String description,
            String metric, Map<String, Object> evidence, Instant generatedAt) {
        return ControlCenterInsightsResponse.InsightItem.builder()
                .type(type)
                .severity(severity)
                .title(title)
                .description(description)
                .metric(metric)
                .evidence(evidence)
                .generatedAt(generatedAt)
                .build();
    }

    /** Tiny HashMap alias to avoid import clash in nested scopes. */
    private static final class HashMapCompat extends java.util.HashMap<Long, Long> {
    }
}
