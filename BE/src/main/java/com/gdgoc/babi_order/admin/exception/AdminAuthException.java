package com.gdgoc.babi_order.admin.exception;

import org.springframework.http.HttpStatus;

public class AdminAuthException extends RuntimeException {

    private final String code;
    private final HttpStatus status;

    public AdminAuthException(String code, String message) {
        this(HttpStatus.UNAUTHORIZED, code, message);
    }

    public AdminAuthException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public String getCode() {
        return code;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
