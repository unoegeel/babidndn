package com.gdgoc.babi_order.dev.analytics.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class ControlCenterSalesResponse {
    private AnalyticsPeriod period;
    private long paidOrders;
    private long revenue;
    private Double averageOrderValue;
    private Double averageItemsPerOrder;
    private List<HourlySalesPoint> byHour;
    private List<MenuSalesPoint> byMenu;

    @Getter
    @Builder
    public static class HourlySalesPoint {
        private int hour;
        private long paidOrders;
        private long revenue;
    }

    @Getter
    @Builder
    public static class MenuSalesPoint {
        private Long menuId;
        private String menuName;
        private long paidQuantity;
        private long paidRevenue;
        private long paidOrderCount;
    }
}
