package com.gdgoc.babi_order.clientevent.exception;

import com.gdgoc.babi_order.common.exception.ApiException;
import org.springframework.http.HttpStatus;

public class ClientEventApiException extends ApiException {

    public ClientEventApiException(HttpStatus status, String code, String message) {
        super(status, code, message);
    }
}
