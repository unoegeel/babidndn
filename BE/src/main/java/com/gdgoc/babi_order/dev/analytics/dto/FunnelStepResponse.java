package com.gdgoc.babi_order.dev.analytics.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * 주문 Funnel 단계 하나.
 *
 * uniqueUsers      = 해당 단계 이벤트를 발생시킨 distinct anonymousId
 * conversionRate   = (이 단계 uniqueUsers / 첫 단계 uniqueUsers) * 100
 * stepConversion   = (이 단계 uniqueUsers / 직전 단계 uniqueUsers) * 100
 *
 * 참고: 단순 기간 내 고유 사용자 수 비교 방식으로 session-based funnel이 아님.
 */
@Getter
@Builder
public class FunnelStepResponse {
    private String eventType;
    private String label;
    private long uniqueUsers;
    private double conversionRate;
    private double stepConversion;
}
