package com.gdgoc.babi_order.dev.analytics.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class AnalyticsOptionsResponse {
    private AnalyticsPeriod period;
    /** selectionCount DESC 정렬 상위 옵션 */
    private List<OptionAnalyticsItem> topOptions;
}
