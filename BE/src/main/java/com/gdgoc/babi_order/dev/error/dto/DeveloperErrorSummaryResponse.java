package com.gdgoc.babi_order.dev.error.dto;

import com.gdgoc.babi_order.dev.error.DeveloperErrorSource;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.Map;

@Getter
@Builder
public class DeveloperErrorSummaryResponse {

    private String id;
    private DeveloperErrorSource source;
    private Instant createdAt;
    private String route;
    private String method;
    private Integer status;
    private String errorType;
    private String messageSummary;
    private String requestId;
    private String relatedRequestId;
    private String browser;
}
