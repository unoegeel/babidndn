package com.gdgoc.babi_order.payment.reconciliation.dto;

import com.gdgoc.babi_order.payment.reconciliation.ReconciliationIssueStatus;
import com.gdgoc.babi_order.payment.reconciliation.ReconciliationIssueType;
import com.gdgoc.babi_order.payment.reconciliation.ReconciliationSeverity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.Map;

@Getter
@Builder
@Schema(description = "저장된 정합성 incident")
public class PersistedReconciliationIssueResponse {

    private Long id;
    private String logicalKey;
    private ReconciliationIssueType type;
    private ReconciliationSeverity severity;
    private ReconciliationIssueStatus status;
    private Long orderId;
    private Long paymentId;
    private String message;
    private Map<String, Object> metadata;
    private LocalDateTime firstDetectedAt;
    private LocalDateTime lastDetectedAt;
    private LocalDateTime resolvedAt;
    private Long occurrenceCount;
}
