package com.gdgoc.babi_order.common.exception;

import lombok.Builder;
import lombok.Getter;

/**
 * 간소 API 오류 응답 (store / contact).
 * JSON: code, message 만 (HTTP status는 ResponseEntity에만 반영)
 */
@Getter
@Builder
public class SimpleErrorResponse {

    private final String code;
    private final String message;

    public static SimpleErrorResponse from(ApiException exception) {
        return SimpleErrorResponse.builder()
                .code(exception.getCode())
                .message(exception.getMessage())
                .build();
    }

    public static SimpleErrorResponse of(String code, String message) {
        return SimpleErrorResponse.builder()
                .code(code)
                .message(message)
                .build();
    }
}
