package com.gdgoc.babi_order.dev.analytics.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class ControlCenterOperationsResponse {
    private AnalyticsPeriod period;
    private long preparingCountToday;
    private long readyCountToday;
    private long activeQueueSizeToday;
    private Double avgProcessingSeconds;
    private Long p50ProcessingSeconds;
    private Long p95ProcessingSeconds;
    private long processingSampleCount;
    private long slowProcessingCount;
    private List<HourlyPoint> queueEntriesByHour;
    private List<HourlyPoint> processingAvgByHour;

    @Getter
    @Builder
    public static class HourlyPoint {
        private int hour;
        private long count;
        private Double avgSeconds;
    }
}
