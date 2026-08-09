package com.gdgoc.babi_order.store.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class PopupAdApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public PopupAdApiException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }
}
