package com.gdgoc.babi_order.contact.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class ContactApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public ContactApiException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }
}
