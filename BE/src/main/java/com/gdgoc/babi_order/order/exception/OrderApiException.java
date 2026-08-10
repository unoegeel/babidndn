package com.gdgoc.babi_order.order.exception;

import com.gdgoc.babi_order.common.exception.ApiException;
import org.springframework.http.HttpStatus;

public class OrderApiException extends ApiException {

    public OrderApiException(HttpStatus status, String code, String message) {
        super(status, code, message);
    }
}
