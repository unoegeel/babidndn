package com.gdgoc.babi_order.dev.analytics.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class AnalyticsMenuOptionsResponse {

    private AnalyticsPeriod period;
    private long menuId;
    private String menuName;
    /** MENU_OPTION_OPEN + menuId 기준 distinct anonymousId */
    private long engagedUsers;
    private List<MenuOptionAnalyticsItem> options;
}
