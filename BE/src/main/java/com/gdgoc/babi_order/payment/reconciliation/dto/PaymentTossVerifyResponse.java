package com.gdgoc.babi_order.payment.reconciliation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
@Schema(description = "Toss 단건 read-only 검증 결과 (결제/주문 상태 변경 없음)")
public class PaymentTossVerifyResponse {

    private Long paymentId;
    private Long orderId;
    private String internalStatus;
    private String tossStatus;
    private Integer internalAmount;
    private Integer tossAmount;
    private boolean statusMatches;
    private boolean amountMatches;
    private LocalDateTime verifiedAt;
}
