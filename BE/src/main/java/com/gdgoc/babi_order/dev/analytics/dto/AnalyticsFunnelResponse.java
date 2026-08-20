package com.gdgoc.babi_order.dev.analytics.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class AnalyticsFunnelResponse {
    private AnalyticsPeriod period;
    private List<FunnelStepResponse> steps;
}
