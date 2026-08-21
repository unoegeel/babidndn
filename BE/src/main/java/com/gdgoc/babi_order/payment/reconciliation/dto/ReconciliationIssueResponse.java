package com.gdgoc.babi_order.payment.reconciliation.dto;

import com.gdgoc.babi_order.payment.reconciliation.ReconciliationIssueType;
import com.gdgoc.babi_order.payment.reconciliation.ReconciliationSeverity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.Map;

@Getter
@Builder
@Schema(description = "결제·주문 정합성 이상 건")
public class ReconciliationIssueResponse {

    @Schema(description = "이상 유형")
    private ReconciliationIssueType type;

    @Schema(description = "심각도")
    private ReconciliationSeverity severity;

    @Schema(description = "주문 ID")
    private Long orderId;

    @Schema(description = "결제 ID (해당 시)")
    private Long paymentId;

    @Schema(description = "설명")
    private String message;

    @Schema(description = "탐지 기준 시각 (결제 승인/주문 갱신)")
    private LocalDateTime detectedAt;

    @Schema(description = "추가 정보")
    private Map<String, Object> metadata;
}
