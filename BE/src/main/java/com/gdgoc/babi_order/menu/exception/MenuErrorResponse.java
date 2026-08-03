package com.gdgoc.babi_order.menu.exception;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "메뉴 API 오류 응답")
public record MenuErrorResponse(
        @Schema(description = "HTTP 상태 코드", example = "404") int status,
        @Schema(description = "오류 코드", example = "MENU_NOT_FOUND") String code,
        @Schema(description = "오류 메시지") String message,
        @Schema(description = "오류 발생 시각") LocalDateTime timestamp
) {
}
