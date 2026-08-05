package com.gdgoc.babi_order.payment.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "결제 승인 요청")
public class PaymentConfirmRequest {

    @NotBlank(message = "paymentKey는 필수입니다.")
    @Schema(description = "토스 결제 키", example = "tviva20240101...")
    private String paymentKey;

    @NotBlank(message = "orderId는 필수입니다.")
    @Schema(description = "토스 주문번호", example = "MC45NTQ4MTg2NjE2NDM1")
    private String orderId;

    @NotNull(message = "amount는 필수입니다.")
    @Positive(message = "amount는 0보다 커야 합니다.")
    @Schema(description = "결제 금액", example = "15000")
    private Integer amount;

    @Schema(description = "백엔드 주문 PK (결제 승인 시 동일 DB 조회 보장, 선택)")
    private Long internalOrderId;
}
