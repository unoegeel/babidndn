package com.gdgoc.babi_order.payment.exception;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "결제 API 오류 응답")
public record PaymentErrorResponse(
        @Schema(description = "HTTP 상태 코드", example = "404") int status,
        @Schema(description = "오류 코드", example = "PAYMENT_NOT_FOUND") String code,
        @Schema(description = "오류 메시지") String message,
        @Schema(description = "오류 발생 시각") LocalDateTime timestamp
) {
}
