package com.gdgoc.babi_order.dev.analytics.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ControlCenterPaymentsResponse {
    private AnalyticsPeriod period;
    private long paymentStartEvents;
    private long paymentSuccessEvents;
    private long paymentFailEvents;
    private long donePayments;
    private long canceledPayments;
    private long partialCanceledPayments;
    private Double behaviorSuccessRate;
    private Double transactionalDoneShare;
    private long reconciliationOpenCount;
    private long reconciliationResolvedCount;
}
