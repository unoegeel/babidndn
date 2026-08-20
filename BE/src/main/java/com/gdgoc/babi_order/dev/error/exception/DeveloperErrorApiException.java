package com.gdgoc.babi_order.dev.error.exception;

import com.gdgoc.babi_order.common.exception.ApiException;
import org.springframework.http.HttpStatus;

public class DeveloperErrorApiException extends ApiException {

    public DeveloperErrorApiException(HttpStatus status, String code, String message) {
        super(status, code, message);
    }
}
