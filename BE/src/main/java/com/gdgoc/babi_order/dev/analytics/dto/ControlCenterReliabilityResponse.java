package com.gdgoc.babi_order.dev.analytics.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class ControlCenterReliabilityResponse {
    private AnalyticsPeriod period;
    private long clientErrorCount;
    private long backendErrorCount;
    private long apiRequestCount;
    private Double clientErrorPer1kRequests;
    private Double backendErrorPer1kRequests;
    private List<NamedCount> topClientSources;
    private List<NamedCount> topClientRoutes;
    private List<NamedCount> topBackendExceptions;
    private List<NamedCount> topBackendPaths;

    @Getter
    @Builder
    public static class NamedCount {
        private String name;
        private long count;
    }
}
