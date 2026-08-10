package com.gdgoc.babi_order.payment.exception;

import com.gdgoc.babi_order.common.exception.ApiException;
import org.springframework.http.HttpStatus;

public class PaymentApiException extends ApiException {

    public PaymentApiException(HttpStatus status, String code, String message) {
        super(status, code, message);
    }
}
