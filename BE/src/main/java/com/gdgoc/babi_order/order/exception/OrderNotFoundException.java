package com.gdgoc.babi_order.order.exception;

import org.springframework.http.HttpStatus;

public class OrderNotFoundException extends OrderApiException {

    public OrderNotFoundException(Long orderId) {
        super(
                HttpStatus.NOT_FOUND,
                "ORDER_NOT_FOUND",
                orderId == null
                        ? "주문을 찾을 수 없습니다."
                        : "주문을 찾을 수 없습니다. id=" + orderId
        );
    }
}
