package com.gdgoc.babi_order.admin.exception;

public class AdminAuthException extends RuntimeException {

    private final String code;

    public AdminAuthException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
