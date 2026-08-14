package com.gdgoc.babi_order.sales.exception;

import com.gdgoc.babi_order.common.exception.ApiException;
import org.springframework.http.HttpStatus;

public class SalesApiException extends ApiException {

    public SalesApiException(HttpStatus status, String code, String message) {
        super(status, code, message);
    }
}
