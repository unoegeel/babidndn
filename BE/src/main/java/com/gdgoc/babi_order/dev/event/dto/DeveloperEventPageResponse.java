package com.gdgoc.babi_order.dev.event.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class DeveloperEventPageResponse {

    private List<DeveloperEventSummaryResponse> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
}
