package com.gdgoc.babi_order.dev.overview.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class OverviewEventsMetrics {

    /** Asia/Seoul 오늘 */
    private long today;

    private long uniqueSessions;

    /** 가장 많이 발생한 event_type (없으면 null) */
    private String topEvent;
}
