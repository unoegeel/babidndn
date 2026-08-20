package com.gdgoc.babi_order.dev.analytics.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class MenuOptionAnalyticsItem {

    private long optionId;
    private String optionName;
    private String optionGroup;
    private long selectedUsers;
    private double selectionRate;
    private Integer additionalPrice;
}
