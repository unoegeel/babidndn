package com.gdgoc.babi_order.payment.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
@Schema(description = "결제 승인 응답")
public class PaymentConfirmResponse {

    @Schema(description = "결제 ID", example = "1")
    private Long id;

    @Schema(description = "토스 결제 키", example = "tviva20260723151557o3Qi4")
    private String paymentKey;

    @Schema(description = "주문 ID", example = "1")
    private Long orderId;

    @Schema(description = "토스 주문번호", example = "000001-a1b2c3d4")
    private String tossOrderId;

    @Schema(description = "결제 금액", example = "8000")
    private Integer amount;

    @Schema(description = "결제 상태", example = "DONE")
    private String status;

    @Schema(description = "결제 승인 시각", example = "2026-07-23T15:17:25")
    private LocalDateTime approvedAt;
}
