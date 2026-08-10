package com.gdgoc.babi_order.contact.exception;

import com.gdgoc.babi_order.common.exception.ApiException;
import org.springframework.http.HttpStatus;

public class ContactApiException extends ApiException {

    public ContactApiException(HttpStatus status, String code, String message) {
        super(status, code, message);
    }
}
