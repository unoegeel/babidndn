package com.gdgoc.babi_order.dev.analytics.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.Map;

@Getter
@Builder
public class ControlCenterInsightsResponse {
    private AnalyticsPeriod period;
    private java.util.List<InsightItem> insights;

    @Getter
    @Builder
    public static class InsightItem {
        private String type;
        private String severity;
        private String title;
        private String description;
        private String metric;
        private Map<String, Object> evidence;
        private Instant generatedAt;
    }
}
