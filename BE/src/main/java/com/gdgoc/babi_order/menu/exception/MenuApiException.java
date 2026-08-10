package com.gdgoc.babi_order.menu.exception;

import com.gdgoc.babi_order.common.exception.ApiException;
import org.springframework.http.HttpStatus;

public class MenuApiException extends ApiException {

    public MenuApiException(HttpStatus status, String code, String message) {
        super(status, code, message);
    }
}
