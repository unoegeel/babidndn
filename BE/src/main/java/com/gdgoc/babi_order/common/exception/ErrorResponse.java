package com.gdgoc.babi_order.common.exception;

import io.swagger.v3.oas.annotations.media.Schema;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;

/**
 * 표준 API 오류 응답 (menu / order / payment / admin).
 * JSON: status, code, message, timestamp
 */
@Schema(description = "API 오류 응답")
public record ErrorResponse(
        @Schema(description = "HTTP 상태 코드", example = "404") int status,
        @Schema(description = "오류 코드", example = "NOT_FOUND") String code,
        @Schema(description = "오류 메시지") String message,
        @Schema(description = "오류 발생 시각") LocalDateTime timestamp
) {
    public static ErrorResponse from(ApiException exception) {
        return of(exception.getStatus(), exception.getCode(), exception.getMessage());
    }

    public static ErrorResponse of(HttpStatus status, String code, String message) {
        return new ErrorResponse(status.value(), code, message, LocalDateTime.now());
    }
}
