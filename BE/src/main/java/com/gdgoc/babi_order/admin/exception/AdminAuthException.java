package com.gdgoc.babi_order.admin.exception;

import com.gdgoc.babi_order.common.exception.ApiException;
import org.springframework.http.HttpStatus;

public class AdminAuthException extends ApiException {

    public AdminAuthException(String code, String message) {
        this(HttpStatus.UNAUTHORIZED, code, message);
    }

    public AdminAuthException(HttpStatus status, String code, String message) {
        super(status, code, message);
    }
}
