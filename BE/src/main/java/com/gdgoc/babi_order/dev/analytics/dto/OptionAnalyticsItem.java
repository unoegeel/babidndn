package com.gdgoc.babi_order.dev.analytics.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * 옵션별 선택 집계
 *
 * optionId       = OPTION_SELECTED metadata.optionId
 * optionName     = menu_options 테이블 JOIN (없으면 "삭제된 옵션")
 * optionGroup    = OPTION_SELECTED metadata.optionGroup
 * menuId         = OPTION_SELECTED metadata.menuId (해당 메뉴 확인용)
 * selectionCount = OPTION_SELECTED count (해당 optionId)
 * uniqueUsers    = OPTION_SELECTED distinct anonymousId (해당 optionId)
 *
 * 참고: 선택률(selectionRate)은 정확한 분모(노출 수)를 알 수 없으므로 제공하지 않음.
 */
@Getter
@Builder
public class OptionAnalyticsItem {
    private long optionId;
    private String optionName;
    private String optionGroup;
    private long menuId;
    private long selectionCount;
    private long uniqueUsers;
}
