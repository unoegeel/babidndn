package com.gdgoc.babi_order.payment.reconciliation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
@Schema(description = "정합성 스캔(persist) 결과 — 신규/재탐지/해결 구분")
public class ReconciliationScanResponse {

    private LocalDateTime scannedAt;
    private String period;
    private int detectedCount;
    private int createdCount;
    private int updatedCount;
    private int resolvedCount;
    private long openCount;
    private List<Long> createdIssueIds;
}
