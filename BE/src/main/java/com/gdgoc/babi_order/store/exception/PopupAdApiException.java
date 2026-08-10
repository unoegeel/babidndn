package com.gdgoc.babi_order.store.exception;

import com.gdgoc.babi_order.common.exception.ApiException;
import org.springframework.http.HttpStatus;

public class PopupAdApiException extends ApiException {

    public PopupAdApiException(HttpStatus status, String code, String message) {
        super(status, code, message);
    }
}
