package com.gdgoc.babi_order.dev.analytics.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class ControlCenterFunnelResponse {
    private AnalyticsPeriod period;
    /** Period-scoped distinct anonymous_id (not sequential). */
    private List<FunnelAggregateStep> aggregateByAnonymous;
    /** Session sequential MENU→CART→CHECKOUT→PAYMENT_START when timestamps allow. */
    private List<FunnelAggregateStep> sequentialBySession;
    private String largestDropOffStage;
    private String metricNote;

    @Getter
    @Builder
    public static class FunnelAggregateStep {
        private String eventType;
        private String label;
        private long eventCount;
        private long uniqueCount;
        private Double stepConversion;
        private Double dropOffRate;
    }
}
