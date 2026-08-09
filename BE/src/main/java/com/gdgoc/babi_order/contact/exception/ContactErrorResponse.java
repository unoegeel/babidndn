package com.gdgoc.babi_order.contact.exception;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ContactErrorResponse {

    private final String code;
    private final String message;
}
