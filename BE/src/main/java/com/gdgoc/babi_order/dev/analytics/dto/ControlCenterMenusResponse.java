package com.gdgoc.babi_order.dev.analytics.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class ControlCenterMenusResponse {
    private AnalyticsPeriod period;
    private int minViewsForConversion;
    private List<MenuPerformanceItem> menus;

    @Getter
    @Builder
    public static class MenuPerformanceItem {
        private Long menuId;
        private String menuName;
        private long views;
        private long cartAdds;
        private long paidQuantity;
        private long paidRevenue;
        private long paidOrderCount;
        private Double viewToCartRate;
        private Double viewToPurchaseRate;
    }
}
