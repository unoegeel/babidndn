package com.gdgoc.babi_order.dev.request.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class DeveloperRequestPageResponse {

    private List<DeveloperRequestSummaryResponse> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
}
