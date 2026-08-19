package com.gdgoc.babi_order.dev.request;

import com.gdgoc.babi_order.common.exception.ApiException;
import com.gdgoc.babi_order.dev.request.dto.DeveloperRequestDetailResponse;
import com.gdgoc.babi_order.dev.request.dto.DeveloperRequestPageResponse;
import com.gdgoc.babi_order.dev.request.dto.DeveloperRequestSummaryResponse;
import com.gdgoc.babi_order.dev.request.support.DeveloperRequestSpecifications;
import com.gdgoc.babi_order.httprequest.entity.HttpRequestRecord;
import com.gdgoc.babi_order.httprequest.repository.HttpRequestRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DeveloperRequestService {

    private final HttpRequestRecordRepository httpRequestRecordRepository;

    public DeveloperRequestPageResponse list(
            String requestId,
            String method,
            Integer status,
            String path,
            Instant from,
            Instant to,
            Long minDuration,
            Long maxDuration,
            int page,
            int size
    ) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);

        Specification<HttpRequestRecord> spec = DeveloperRequestSpecifications.filter(
                requestId, method, status, path, from, to, minDuration, maxDuration
        );
        Page<HttpRequestRecord> result = httpRequestRecordRepository.findAll(
                spec,
                PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"))
        );

        return DeveloperRequestPageResponse.builder()
                .content(result.getContent().stream().map(this::toSummary).toList())
                .page(safePage)
                .size(safeSize)
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build();
    }

    public DeveloperRequestDetailResponse getDetail(long id) {
        HttpRequestRecord record = httpRequestRecordRepository.findById(id)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "REQUEST_NOT_FOUND",
                        "요청 기록을 찾을 수 없습니다."
                ));
        return toDetail(record);
    }

    private DeveloperRequestSummaryResponse toSummary(HttpRequestRecord record) {
        return DeveloperRequestSummaryResponse.builder()
                .id(record.getId())
                .requestId(record.getRequestId())
                .timestamp(record.getCreatedAt())
                .method(record.getMethod())
                .path(record.getPath())
                .status(record.getStatus())
                .durationMs(record.getDurationMs())
                .build();
    }

    private DeveloperRequestDetailResponse toDetail(HttpRequestRecord record) {
        return DeveloperRequestDetailResponse.builder()
                .id(record.getId())
                .requestId(record.getRequestId())
                .timestamp(record.getCreatedAt())
                .method(record.getMethod())
                .path(record.getPath())
                .status(record.getStatus())
                .durationMs(record.getDurationMs())
                .userAgent(record.getUserAgent())
                .build();
    }
}
