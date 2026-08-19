package com.gdgoc.babi_order.dev.request;

import com.gdgoc.babi_order.dev.request.dto.DeveloperRequestDetailResponse;
import com.gdgoc.babi_order.dev.request.dto.DeveloperRequestPageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

@RestController
@RequestMapping("/api/dev/requests")
@RequiredArgsConstructor
@Tag(name = "DeveloperRequest", description = "Developer Console Request Monitoring")
public class DeveloperRequestController {

    private final DeveloperRequestService developerRequestService;

    @GetMapping
    @Operation(summary = "Request 목록", description = "HTTP 요청 기록을 조회합니다.")
    public DeveloperRequestPageResponse list(
            @RequestParam(required = false) String requestId,
            @RequestParam(required = false) String method,
            @RequestParam(required = false) Integer status,
            @RequestParam(required = false) String path,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(required = false) Long minDuration,
            @RequestParam(required = false) Long maxDuration,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        return developerRequestService.list(
                requestId, method, status, path, from, to, minDuration, maxDuration, page, size
        );
    }

    @GetMapping("/{id}")
    @Operation(summary = "Request 상세")
    public DeveloperRequestDetailResponse detail(@PathVariable long id) {
        return developerRequestService.getDetail(id);
    }
}
