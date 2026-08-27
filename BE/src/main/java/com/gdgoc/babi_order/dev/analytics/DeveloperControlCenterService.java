package com.gdgoc.babi_order.dev.analytics;

import com.gdgoc.babi_order.clientevent.ClientEventType;
import com.gdgoc.babi_order.common.time.StoreTime;
import com.gdgoc.babi_order.dev.analytics.dto.AnalyticsPeriod;
import com.gdgoc.babi_order.dev.analytics.dto.ControlCenterFunnelResponse;
import com.gdgoc.babi_order.dev.analytics.dto.ControlCenterMenusResponse;
import com.gdgoc.babi_order.dev.analytics.dto.ControlCenterOperationsResponse;
import com.gdgoc.babi_order.dev.analytics.dto.ControlCenterOverviewResponse;
import com.gdgoc.babi_order.dev.analytics.dto.ControlCenterPaymentsResponse;
import com.gdgoc.babi_order.dev.analytics.dto.ControlCenterPerformanceResponse;
import com.gdgoc.babi_order.dev.analytics.dto.ControlCenterReliabilityResponse;
import com.gdgoc.babi_order.dev.analytics.dto.ControlCenterSalesResponse;
import com.gdgoc.babi_order.menu.repository.MenuRepository;
import com.gdgoc.babi_order.payment.reconciliation.ReconciliationIssueStatus;
import com.gdgoc.babi_order.payment.reconciliation.repository.PaymentReconciliationIssueRepository;
import com.gdgoc.babi_order.sales.repository.HourlyRevenueRow;
import com.gdgoc.babi_order.sales.repository.MenuPaidSalesRow;
import com.gdgoc.babi_order.sales.repository.SalesQueryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DeveloperControlCenterService {

    static final int MIN_VIEWS_FOR_CONVERSION = 10;
    static final long SLOW_PROCESSING_SECONDS = 600;
    static final int ENDPOINT_LIMIT = 20;

    private final AnalyticsQueryRepository eventQuery;
    private final ControlCenterQueryRepository opsQuery;
    private final SalesQueryRepository salesQuery;
    private final PaymentReconciliationIssueRepository reconciliationIssueRepository;
    private final MenuRepository menuRepository;
    private final DeveloperInsightService insightService;

    public ControlCenterOverviewResponse overview(AnalyticsRange range) {
        Instant from = range.fromInstant();
        Instant to = range.toInstant();
        long paid = salesQuery.countDonePayments(range.fromLdtInclusive(), range.toLdtExclusive());
        long revenue = salesQuery.sumDonePaymentAmount(range.fromLdtInclusive(), range.toLdtExclusive());
        Double avgItems = salesQuery.averageItemsPerPaidOrder(range.fromLdtInclusive(), range.toLdtExclusive());
        long starts = eventQuery.countEvents(ClientEventType.PAYMENT_START.name(), from, to);
        long successEv = eventQuery.countEvents(ClientEventType.PAYMENT_SUCCESS.name(), from, to);
        List<Long> proc = opsQuery.processingDurationsSeconds(range.fromLdtInclusive(), range.toLdtExclusive());
        List<Long> latencies = opsQuery.httpDurationsMs(from, to);
        long req = opsQuery.countHttpRequests(from, to);
        long s5xx = opsQuery.countHttpByStatusRange(from, to, 500, 600);
        long startSessions = opsQuery.countPaymentStartSessions(from, to);
        long startThenSuccess = opsQuery.countPaymentStartThenSuccessSessions(from, to);

        return ControlCenterOverviewResponse.builder()
                .period(period(range))
                .paidOrders(paid)
                .revenue(revenue)
                .averageOrderValue(paid > 0 ? round2((double) revenue / paid) : null)
                .averageItemsPerOrder(avgItems == null ? null : round2(avgItems))
                .paymentSuccessRate(PaymentBehaviorSuccessRate.of(startSessions, startThenSuccess))
                .avgProcessingSeconds(proc.isEmpty() ? null : round2(ControlCenterQueryRepository.average(proc)))
                .p50ProcessingSeconds(ControlCenterQueryRepository.percentile(proc, 0.50))
                .p95ProcessingSeconds(ControlCenterQueryRepository.percentile(proc, 0.95))
                .processingSampleCount(proc.size())
                .apiRequestCount(req)
                .apiP95LatencyMs(ControlCenterQueryRepository.percentile(latencies, 0.95))
                .status5xxCount(s5xx)
                .status5xxRate(req > 0 ? round2((double) s5xx / req * 100.0) : null)
                .clientErrorCount(opsQuery.countClientErrors(from, to))
                .backendErrorCount(opsQuery.countBackendErrors(from, to))
                .reconciliationOpenCount(reconciliationIssueRepository.countByStatus(ReconciliationIssueStatus.OPEN))
                .uniqueVisitors(eventQuery.countDistinctAnonymousId(ClientEventType.MENU_VIEW.name(), from, to))
                .menuViews(eventQuery.countEvents(ClientEventType.MENU_VIEW.name(), from, to))
                .paymentStarts(starts)
                .paymentSuccessEvents(successEv)
                .build();
    }

    public ControlCenterSalesResponse sales(AnalyticsRange range) {
        long paid = salesQuery.countDonePayments(range.fromLdtInclusive(), range.toLdtExclusive());
        long revenue = salesQuery.sumDonePaymentAmount(range.fromLdtInclusive(), range.toLdtExclusive());
        Double avgItems = salesQuery.averageItemsPerPaidOrder(range.fromLdtInclusive(), range.toLdtExclusive());
        List<HourlyRevenueRow> hourly = salesQuery.findHourlyRevenue(range.fromLdtInclusive(), range.toLdtExclusive());
        List<MenuPaidSalesRow> menus = salesQuery.findMenuPaidSales(range.fromLdtInclusive(), range.toLdtExclusive());

        return ControlCenterSalesResponse.builder()
                .period(period(range))
                .paidOrders(paid)
                .revenue(revenue)
                .averageOrderValue(paid > 0 ? round2((double) revenue / paid) : null)
                .averageItemsPerOrder(avgItems == null ? null : round2(avgItems))
                .byHour(hourly.stream()
                        .map(h -> ControlCenterSalesResponse.HourlySalesPoint.builder()
                                .hour(h.hour())
                                .paidOrders(h.orderCount())
                                .revenue(h.totalAmount())
                                .build())
                        .toList())
                .byMenu(menus.stream()
                        .map(m -> ControlCenterSalesResponse.MenuSalesPoint.builder()
                                .menuId(m.menuId())
                                .menuName(m.menuName())
                                .paidQuantity(m.paidQuantity())
                                .paidRevenue(m.paidRevenue())
                                .paidOrderCount(m.paidOrderCount())
                                .build())
                        .toList())
                .build();
    }

    public ControlCenterFunnelResponse funnel(AnalyticsRange range) {
        Instant from = range.fromInstant();
        Instant to = range.toInstant();
        String[][] steps = {
                {"MENU_VIEW", "메뉴 조회"},
                {"ADD_TO_CART", "장바구니 추가"},
                {"CHECKOUT_VIEW", "결제 화면"},
                {"PAYMENT_START", "결제 시작"}
        };

        List<ControlCenterFunnelResponse.FunnelAggregateStep> aggregate = new ArrayList<>();
        long prevAnon = 0;
        String largestDrop = null;
        double largestDropRate = -1;

        for (int i = 0; i < steps.length; i++) {
            String type = steps[i][0];
            long events = eventQuery.countEvents(type, from, to);
            long unique = eventQuery.countDistinctAnonymousId(type, from, to);
            FunnelTransitionRates.Rates rates = FunnelTransitionRates.of(i, prevAnon, unique);
            if (i > 0) {
                largestDrop = FunnelTransitionRates.pickLargestDropOff(
                        steps[i - 1][0], type, rates.dropOffRate(), largestDrop, largestDropRate);
                largestDropRate = FunnelTransitionRates.nextLargestRate(rates.dropOffRate(), largestDropRate);
            }
            aggregate.add(ControlCenterFunnelResponse.FunnelAggregateStep.builder()
                    .eventType(type)
                    .label(steps[i][1])
                    .eventCount(events)
                    .uniqueCount(unique)
                    .stepConversion(rates.stepConversion())
                    .dropOffRate(rates.dropOffRate())
                    .build());
            prevAnon = unique;
        }

        List<ControlCenterFunnelResponse.FunnelAggregateStep> sequential = new ArrayList<>();
        long prevSeq = 0;
        for (int i = 0; i < steps.length; i++) {
            String type = steps[i][0];
            long unique = opsQuery.countSessionsReaching(from, to, type);
            long events = eventQuery.countEvents(type, from, to);
            FunnelTransitionRates.Rates rates = FunnelTransitionRates.of(i, prevSeq, unique);
            sequential.add(ControlCenterFunnelResponse.FunnelAggregateStep.builder()
                    .eventType(type)
                    .label(steps[i][1])
                    .eventCount(events)
                    .uniqueCount(unique)
                    .stepConversion(rates.stepConversion())
                    .dropOffRate(rates.dropOffRate())
                    .build());
            prevSeq = unique;
        }

        return ControlCenterFunnelResponse.builder()
                .period(period(range))
                .aggregateByAnonymous(aggregate)
                .sequentialBySession(sequential)
                .largestDropOffStage(largestDrop)
                .metricNote("aggregateByAnonymous=기간 내 distinct anonymous_id (비순차). "
                        + "sequentialBySession=session_id 기준 MENU→CART→CHECKOUT→PAYMENT_START 시간 순서.")
                .build();
    }

    public ControlCenterMenusResponse menus(AnalyticsRange range) {
        Instant from = range.fromInstant();
        Instant to = range.toInstant();
        Map<Long, ControlCenterQueryRepository.MenuBehaviorRow> behavior = new HashMap<>();
        for (var row : opsQuery.menuBehavior(from, to)) {
            behavior.put(row.menuId(), row);
        }
        Map<Long, MenuPaidSalesRow> paidById = new HashMap<>();
        Map<String, MenuPaidSalesRow> paidByName = new HashMap<>();
        for (MenuPaidSalesRow row : salesQuery.findMenuPaidSales(range.fromLdtInclusive(), range.toLdtExclusive())) {
            if (row.menuId() != null) {
                paidById.put(row.menuId(), row);
            }
            paidByName.put(row.menuName(), row);
        }

        Map<Long, String> names = new HashMap<>();
        menuRepository.findAll().forEach(m -> names.put(m.getId(), m.getName()));

        List<ControlCenterMenusResponse.MenuPerformanceItem> items = new ArrayList<>();
        for (Long menuId : behavior.keySet()) {
            var b = behavior.get(menuId);
            MenuPaidSalesRow paid = paidById.get(menuId);
            String name = names.getOrDefault(menuId, paid != null ? paid.menuName() : ("menu#" + menuId));
            long views = b.views();
            long carts = b.cartAdds();
            long qty = paid == null ? 0 : paid.paidQuantity();
            long rev = paid == null ? 0 : paid.paidRevenue();
            long orders = paid == null ? 0 : paid.paidOrderCount();
            Double v2c = views >= MIN_VIEWS_FOR_CONVERSION ? round2((double) carts / views * 100.0) : null;
            Double v2p = views >= MIN_VIEWS_FOR_CONVERSION ? round2((double) orders / views * 100.0) : null;
            items.add(ControlCenterMenusResponse.MenuPerformanceItem.builder()
                    .menuId(menuId)
                    .menuName(name)
                    .views(views)
                    .cartAdds(carts)
                    .paidQuantity(qty)
                    .paidRevenue(rev)
                    .paidOrderCount(orders)
                    .viewToCartRate(v2c)
                    .viewToPurchaseRate(v2p)
                    .build());
        }
        // include paid-only menus without views in period
        for (MenuPaidSalesRow paid : paidByName.values()) {
            if (paid.menuId() != null && behavior.containsKey(paid.menuId())) {
                continue;
            }
            if (paid.menuId() == null) {
                items.add(ControlCenterMenusResponse.MenuPerformanceItem.builder()
                        .menuId(null)
                        .menuName(paid.menuName())
                        .views(0)
                        .cartAdds(0)
                        .paidQuantity(paid.paidQuantity())
                        .paidRevenue(paid.paidRevenue())
                        .paidOrderCount(paid.paidOrderCount())
                        .build());
            } else if (!behavior.containsKey(paid.menuId())) {
                items.add(ControlCenterMenusResponse.MenuPerformanceItem.builder()
                        .menuId(paid.menuId())
                        .menuName(paid.menuName())
                        .views(0)
                        .cartAdds(0)
                        .paidQuantity(paid.paidQuantity())
                        .paidRevenue(paid.paidRevenue())
                        .paidOrderCount(paid.paidOrderCount())
                        .build());
            }
        }
        items.sort((a, b) -> Long.compare(b.getPaidRevenue(), a.getPaidRevenue()));

        return ControlCenterMenusResponse.builder()
                .period(period(range))
                .minViewsForConversion(MIN_VIEWS_FOR_CONVERSION)
                .menus(items)
                .build();
    }

    public ControlCenterPaymentsResponse payments(AnalyticsRange range) {
        Instant from = range.fromInstant();
        Instant to = range.toInstant();
        long starts = eventQuery.countEvents(ClientEventType.PAYMENT_START.name(), from, to);
        long successEv = eventQuery.countEvents(ClientEventType.PAYMENT_SUCCESS.name(), from, to);
        long failEv = eventQuery.countEvents(ClientEventType.PAYMENT_FAIL.name(), from, to);
        long done = salesQuery.countDonePayments(range.fromLdtInclusive(), range.toLdtExclusive());
        long canceled = salesQuery.countPaymentsByStatus("CANCELED", range.fromLdtInclusive(), range.toLdtExclusive());
        long partial = salesQuery.countPaymentsByStatus("PARTIAL_CANCELED", range.fromLdtInclusive(), range.toLdtExclusive());
        long txnTotal = done + canceled + partial;
        long startSessions = opsQuery.countPaymentStartSessions(from, to);
        long startThenSuccess = opsQuery.countPaymentStartThenSuccessSessions(from, to);

        return ControlCenterPaymentsResponse.builder()
                .period(period(range))
                .paymentStartEvents(starts)
                .paymentSuccessEvents(successEv)
                .paymentFailEvents(failEv)
                .donePayments(done)
                .canceledPayments(canceled)
                .partialCanceledPayments(partial)
                .behaviorSuccessRate(PaymentBehaviorSuccessRate.of(startSessions, startThenSuccess))
                .transactionalDoneShare(txnTotal > 0 ? round2((double) done / txnTotal * 100.0) : null)
                .reconciliationOpenCount(reconciliationIssueRepository.countByStatus(ReconciliationIssueStatus.OPEN))
                .reconciliationResolvedCount(reconciliationIssueRepository.countByStatus(ReconciliationIssueStatus.RESOLVED))
                .build();
    }

    public ControlCenterOperationsResponse operations(AnalyticsRange range) {
        var dayStart = StoreTime.startOfToday();
        var dayEnd = StoreTime.startOfTomorrow();
        long preparing = opsQuery.countActiveQueueToday(dayStart, dayEnd, "PREPARING");
        long ready = opsQuery.countActiveQueueToday(dayStart, dayEnd, "READY");
        List<Long> proc = opsQuery.processingDurationsSeconds(range.fromLdtInclusive(), range.toLdtExclusive());

        return ControlCenterOperationsResponse.builder()
                .period(period(range))
                .preparingCountToday(preparing)
                .readyCountToday(ready)
                .activeQueueSizeToday(preparing + ready)
                .avgProcessingSeconds(proc.isEmpty() ? null : round2(ControlCenterQueryRepository.average(proc)))
                .p50ProcessingSeconds(ControlCenterQueryRepository.percentile(proc, 0.50))
                .p95ProcessingSeconds(ControlCenterQueryRepository.percentile(proc, 0.95))
                .processingSampleCount(proc.size())
                .slowProcessingCount(opsQuery.countSlowProcessing(
                        range.fromLdtInclusive(), range.toLdtExclusive(), SLOW_PROCESSING_SECONDS))
                .queueEntriesByHour(opsQuery.queueEntriesByHour(range.fromLdtInclusive(), range.toLdtExclusive())
                        .stream()
                        .map(h -> ControlCenterOperationsResponse.HourlyPoint.builder()
                                .hour(h.hour()).count(h.count()).build())
                        .toList())
                .processingAvgByHour(opsQuery.processingByHour(range.fromLdtInclusive(), range.toLdtExclusive())
                        .stream()
                        .map(h -> ControlCenterOperationsResponse.HourlyPoint.builder()
                                .hour(h.hour())
                                .count(h.sampleCount())
                                .avgSeconds(round2(h.avgSeconds()))
                                .build())
                        .toList())
                .build();
    }

    public ControlCenterPerformanceResponse performance(AnalyticsRange range) {
        Instant from = range.fromInstant();
        Instant to = range.toInstant();
        long total = opsQuery.countHttpRequests(from, to);
        long s2 = opsQuery.countHttpByStatusRange(from, to, 200, 300);
        long s4 = opsQuery.countHttpByStatusRange(from, to, 400, 500);
        long s5 = opsQuery.countHttpByStatusRange(from, to, 500, 600);
        List<Long> ms = opsQuery.httpDurationsMs(from, to);

        return ControlCenterPerformanceResponse.builder()
                .period(period(range))
                .totalRequests(total)
                .status2xx(s2)
                .status4xx(s4)
                .status5xx(s5)
                .rate4xx(total > 0 ? round2((double) s4 / total * 100.0) : null)
                .rate5xx(total > 0 ? round2((double) s5 / total * 100.0) : null)
                .p50LatencyMs(ControlCenterQueryRepository.percentile(ms, 0.50))
                .p95LatencyMs(ControlCenterQueryRepository.percentile(ms, 0.95))
                .p99LatencyMs(ControlCenterQueryRepository.percentile(ms, 0.99))
                .byHour(opsQuery.httpRequestsByHour(from, to).stream()
                        .map(h -> ControlCenterPerformanceResponse.HourlyTraffic.builder()
                                .hour(h.hour()).requests(h.count()).build())
                        .toList())
                .topEndpoints(opsQuery.endpointPerformance(from, to, ENDPOINT_LIMIT).stream()
                        .map(e -> ControlCenterPerformanceResponse.EndpointRow.builder()
                                .path(e.path())
                                .requests(e.requestCount())
                                .avgMs(round2(e.avgMs()))
                                .p95Ms(e.p95Ms())
                                .status5xx(e.status5xx())
                                .build())
                        .toList())
                .build();
    }

    public ControlCenterReliabilityResponse reliability(AnalyticsRange range) {
        Instant from = range.fromInstant();
        Instant to = range.toInstant();
        long client = opsQuery.countClientErrors(from, to);
        long backend = opsQuery.countBackendErrors(from, to);
        long req = opsQuery.countHttpRequests(from, to);

        return ControlCenterReliabilityResponse.builder()
                .period(period(range))
                .clientErrorCount(client)
                .backendErrorCount(backend)
                .apiRequestCount(req)
                .clientErrorPer1kRequests(req > 0 ? round2((double) client / req * 1000.0) : null)
                .backendErrorPer1kRequests(req > 0 ? round2((double) backend / req * 1000.0) : null)
                .topClientSources(opsQuery.topClientErrorSources(from, to, 5).stream()
                        .map(n -> ControlCenterReliabilityResponse.NamedCount.builder()
                                .name(n.name()).count(n.count()).build())
                        .toList())
                .topClientRoutes(opsQuery.topClientErrorRoutes(from, to, 5).stream()
                        .map(n -> ControlCenterReliabilityResponse.NamedCount.builder()
                                .name(n.name()).count(n.count()).build())
                        .toList())
                .topBackendExceptions(opsQuery.topBackendExceptions(from, to, 5).stream()
                        .map(n -> ControlCenterReliabilityResponse.NamedCount.builder()
                                .name(n.name()).count(n.count()).build())
                        .toList())
                .topBackendPaths(opsQuery.topBackendPaths(from, to, 5).stream()
                        .map(n -> ControlCenterReliabilityResponse.NamedCount.builder()
                                .name(n.name()).count(n.count()).build())
                        .toList())
                .build();
    }

    public com.gdgoc.babi_order.dev.analytics.dto.ControlCenterInsightsResponse insights(AnalyticsRange range) {
        return insightService.generate(range);
    }

    private static AnalyticsPeriod period(AnalyticsRange range) {
        return AnalyticsPeriod.builder().from(range.fromInstant()).to(range.toInstant()).build();
    }

    private static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
