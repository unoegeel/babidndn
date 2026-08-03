package com.gdgoc.babi_order.payment.exception;

import org.springframework.http.HttpStatus;

public class PaymentAlreadyProcessedException extends PaymentApiException {

    public PaymentAlreadyProcessedException(Long orderId) {
        super(HttpStatus.CONFLICT, "PAYMENT_ALREADY_PROCESSED",
                "이미 결제가 완료된 주문입니다. orderId=" + orderId);
    }
}
