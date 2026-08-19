package com.gdgoc.babi_order.dev.error.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class DeveloperErrorPageResponse {

    private List<DeveloperErrorSummaryResponse> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
}
