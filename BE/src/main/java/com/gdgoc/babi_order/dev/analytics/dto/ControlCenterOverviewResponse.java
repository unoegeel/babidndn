package com.gdgoc.babi_order.dev.analytics.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class ControlCenterOverviewResponse {
    private AnalyticsPeriod period;
    // transactional
    private long paidOrders;
    private long revenue;
    private Double averageOrderValue;
    private Double averageItemsPerOrder;
    private Double paymentSuccessRate;
    // processing
    private Double avgProcessingSeconds;
    private Long p50ProcessingSeconds;
    private Long p95ProcessingSeconds;
    private long processingSampleCount;
    // http
    private long apiRequestCount;
    private Long apiP95LatencyMs;
    private long status5xxCount;
    private Double status5xxRate;
    // reliability
    private long clientErrorCount;
    private long backendErrorCount;
    private long reconciliationOpenCount;
    // behavior (non-canonical volume)
    private long uniqueVisitors;
    private long menuViews;
    private long paymentStarts;
    private long paymentSuccessEvents;
}
