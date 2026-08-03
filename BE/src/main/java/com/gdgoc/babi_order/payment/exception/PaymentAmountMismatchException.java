package com.gdgoc.babi_order.payment.exception;

import org.springframework.http.HttpStatus;

public class PaymentAmountMismatchException extends PaymentApiException {

    public PaymentAmountMismatchException(Integer expectedAmount, Integer requestedAmount) {
        super(HttpStatus.CONFLICT, "PAYMENT_AMOUNT_MISMATCH",
                "결제 금액이 주문 금액과 일치하지 않습니다. expected=" + expectedAmount + ", requested=" + requestedAmount);
    }
}
