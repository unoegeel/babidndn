package com.gdgoc.babi_order.payment.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "결제 실패 콜백 응답")
public class PaymentFailResponse {

    @Schema(description = "토스 에러 코드", example = "PAY_PROCESS_CANCELED")
    private String code;

    @Schema(description = "실패 메시지", example = "사용자가 결제를 취소했습니다.")
    private String message;

    @Schema(description = "토스 주문번호", example = "000001-a1b2c3d4")
    private String orderId;
}
