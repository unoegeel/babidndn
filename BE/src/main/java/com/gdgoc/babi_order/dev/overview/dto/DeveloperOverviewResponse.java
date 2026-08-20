package com.gdgoc.babi_order.dev.overview.dto;

import com.gdgoc.babi_order.dev.analytics.dto.AnalyticsOverviewResponse;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class DeveloperOverviewResponse {

    private OverviewErrorsMetrics errors;

    private OverviewRequestsMetrics requests;

    private OverviewEventsMetrics events;

    /** DeveloperAnalyticsService.overview() 위임 — Asia/Seoul 오늘 기준 */
    private AnalyticsOverviewResponse funnel;
}
