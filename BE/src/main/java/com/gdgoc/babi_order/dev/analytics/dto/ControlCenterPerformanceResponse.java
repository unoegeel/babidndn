package com.gdgoc.babi_order.dev.analytics.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class ControlCenterPerformanceResponse {
    private AnalyticsPeriod period;
    private long totalRequests;
    private long status2xx;
    private long status4xx;
    private long status5xx;
    private Double rate4xx;
    private Double rate5xx;
    private Long p50LatencyMs;
    private Long p95LatencyMs;
    private Long p99LatencyMs;
    private List<HourlyTraffic> byHour;
    private List<EndpointRow> topEndpoints;

    @Getter
    @Builder
    public static class HourlyTraffic {
        private int hour;
        private long requests;
    }

    @Getter
    @Builder
    public static class EndpointRow {
        private String path;
        private long requests;
        private double avgMs;
        private long p95Ms;
        private long status5xx;
    }
}
