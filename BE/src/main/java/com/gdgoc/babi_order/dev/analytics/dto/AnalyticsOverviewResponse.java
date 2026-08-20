package com.gdgoc.babi_order.dev.analytics.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * Analytics Overview KPI
 *
 * uniqueVisitors  = MENU_VIEW의 distinct anonymousId 수
 * menuViews       = MENU_VIEW count
 * cartAdds        = ADD_TO_CART count
 * cartViewUsers   = CART_VIEW distinct anonymousId
 * checkoutViews   = CHECKOUT_VIEW count
 * paymentStarts   = PAYMENT_START count
 * paymentSuccesses= PAYMENT_SUCCESS count
 * ordersCreated   = ORDER_CREATED count
 * ordersCompleted = ORDER_COMPLETED count
 */
@Getter
@Builder
public class AnalyticsOverviewResponse {

    private AnalyticsPeriod period;

    private long uniqueVisitors;
    private long menuViews;
    private long cartAdds;
    private long checkoutViews;
    private long paymentStarts;
    private long paymentSuccesses;
    private long ordersCreated;
    private long ordersCompleted;
}
