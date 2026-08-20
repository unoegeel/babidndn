package com.gdgoc.babi_order.dev.overview.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class OverviewRequestsMetrics {

    /** Asia/Seoul 오늘 00:00 ~ 현재 */
    private long today;

    private long success;

    private long clientErrors;

    private long serverErrors;

    private long averageDurationMs;
}
