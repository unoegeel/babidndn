package com.gdgoc.babi_order.dev.analytics.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * 메뉴별 분석 집계
 *
 * menuId       = MENU_VIEW / ADD_TO_CART metadata.menuId
 * menuName     = menus 테이블 JOIN (삭제된 경우 "삭제된 메뉴" fallback)
 * views        = MENU_VIEW count (해당 menuId)
 * uniqueViewers= MENU_VIEW distinct anonymousId (해당 menuId)
 * cartAdds     = ADD_TO_CART count (해당 menuId)
 */
@Getter
@Builder
public class MenuAnalyticsItem {
    private long menuId;
    private String menuName;
    private long views;
    private long uniqueViewers;
    private long cartAdds;
}
