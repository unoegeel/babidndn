package com.gdgoc.babi_order.dev.overview.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;

@Getter
@Builder
public class OverviewErrorsMetrics {

    /** 최근 24시간 FE + BE 오류 합계 */
    private long last24h;

    /** 최근 24시간 backend_errors 건수 (status 무관) */
    private long serverErrors;

    /** 최근 24시간 client_errors 건수 */
    private long frontendErrors;

    /** 최근 24시간 내 가장 최근 오류 시각 (없으면 null) */
    private Instant lastOccurredAt;
}
