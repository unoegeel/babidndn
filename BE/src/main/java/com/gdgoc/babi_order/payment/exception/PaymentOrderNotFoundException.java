package com.gdgoc.babi_order.payment.exception;

import org.springframework.http.HttpStatus;

public class PaymentOrderNotFoundException extends PaymentApiException {

    public PaymentOrderNotFoundException(String orderId) {
        super(HttpStatus.NOT_FOUND, "PAYMENT_ORDER_NOT_FOUND",
                "결제 대상 주문을 찾을 수 없습니다. orderId=" + orderId);
    }
}
