package com.gdgoc.babi_order.payment.reconciliation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
@Schema(description = "결제·주문 정합성 점검 결과")
public class PaymentReconciliationResponse {

    @Schema(description = "조회 시각")
    private LocalDateTime generatedAt;

    @Schema(description = "조회 기간 키", example = "7d")
    private String period;

    @Schema(description = "기간 시작 (inclusive)")
    private LocalDateTime from;

    @Schema(description = "이상 건수")
    private int issueCount;

    @Schema(description = "이상 목록")
    private List<ReconciliationIssueResponse> issues;
}
