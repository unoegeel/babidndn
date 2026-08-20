package com.gdgoc.babi_order.clientevent;

/**
 * Frontend User Event type allow-list.
 * 정의되지 않은 값은 거부한다.
 */
public enum ClientEventType {
    MENU_VIEW,
    MENU_OPTION_OPEN,
    OPTION_SELECTED,
    ADD_TO_CART,
    CART_VIEW,
    CART_ITEM_UPDATED,
    CART_ITEM_REMOVED,
    CHECKOUT_VIEW,
    PAYMENT_START,
    PAYMENT_SUCCESS,
    PAYMENT_FAIL,
    ORDER_CREATED,
    ORDER_STATUS_VIEW,
    ORDER_COMPLETED,
    SAVED_MENU_CREATED,
    SAVED_MENU_VIEW,
    SAVED_MENU_UPDATED,
    SAVED_MENU_DELETED,
    SAVED_MENU_REORDER,
    REVIEW_SUBMITTED,
    CONTACT_SUBMITTED
}
