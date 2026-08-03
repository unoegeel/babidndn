package com.gdgoc.babi_order.payment.exception;

import org.springframework.http.HttpStatus;

public class PaymentAlreadyCanceledException extends PaymentApiException {

    public PaymentAlreadyCanceledException(String paymentKey) {
        super(HttpStatus.CONFLICT, "PAYMENT_ALREADY_CANCELED",
                "이미 취소된 결제입니다. paymentKey=" + paymentKey);
    }
}
