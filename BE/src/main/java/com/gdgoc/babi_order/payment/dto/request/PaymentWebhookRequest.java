package com.gdgoc.babi_order.payment.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@Schema(description = "Toss 결제 상태 변경 웹훅")
public class PaymentWebhookRequest {

    @Schema(description = "이벤트 타입", example = "PAYMENT_STATUS_CHANGED")
    private String eventType;

    @Schema(description = "이벤트 데이터")
    private Data data;

    @Getter
    @NoArgsConstructor
    public static class Data {

        @Schema(description = "토스 결제 키", example = "tviva20260723151557o3Qi4")
        private String paymentKey;

        @Schema(description = "토스 주문번호", example = "000001-a1b2c3d4")
        private String orderId;

        @Schema(description = "결제 상태", example = "DONE")
        private String status;
    }
}
