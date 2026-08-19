package com.gdgoc.babi_order.dev.analytics.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;

/** Analytics 조회 기간 */
@Getter
@Builder
public class AnalyticsPeriod {
    private Instant from;
    private Instant to;
}
