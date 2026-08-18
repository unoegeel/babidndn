package com.gdgoc.babi_order.savedmenu.exception;

import com.gdgoc.babi_order.common.exception.ApiException;
import org.springframework.http.HttpStatus;

public class SavedMenuApiException extends ApiException {

    public SavedMenuApiException(HttpStatus status, String code, String message) {
        super(status, code, message);
    }
}
