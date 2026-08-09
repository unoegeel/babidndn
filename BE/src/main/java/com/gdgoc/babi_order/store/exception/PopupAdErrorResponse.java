package com.gdgoc.babi_order.store.exception;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PopupAdErrorResponse {

    private final String code;
    private final String message;
}
