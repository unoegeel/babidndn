package com.gdgoc.babi_order.dev.analytics.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class AnalyticsMenusResponse {
    private AnalyticsPeriod period;
    /** views DESC 정렬 상위 메뉴 목록 */
    private List<MenuAnalyticsItem> topMenusByViews;
    /** cartAdds DESC 정렬 상위 메뉴 목록 */
    private List<MenuAnalyticsItem> topMenusByCartAdds;
}
