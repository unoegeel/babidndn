package com.gdgoc.babi_order.menu.entity;

public enum OptionGroupType {
    SIZE,
    PACKAGING,
    TOPPING_ADD,
    TOPPING_REMOVE;

    /** 유저 옵션시트를 열어야 하는 그룹인지 */
    public boolean enablesOptionSheet() {
        return this == TOPPING_ADD || this == TOPPING_REMOVE || this == PACKAGING;
    }
}
