package com.gdgoc.babi_order.admin.exception;

import java.time.LocalDateTime;

public record AdminAuthErrorResponse(
        int status,
        String code,
        String message,
        LocalDateTime timestamp
) {
}
