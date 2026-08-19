package com.gdgoc.babi_order.dev.request.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;

@Getter
@Builder
public class DeveloperRequestDetailResponse {

    private Long id;
    private String requestId;
    private Instant timestamp;
    private String method;
    private String path;
    private int status;
    private long durationMs;
    private String userAgent;
}
