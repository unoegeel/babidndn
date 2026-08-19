package com.gdgoc.babi_order.dev.error;

import com.gdgoc.babi_order.dev.error.dto.DeveloperErrorDetailResponse;
import com.gdgoc.babi_order.dev.error.dto.DeveloperErrorPageResponse;
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
@RequestMapping("/api/dev/errors")
@RequiredArgsConstructor
@Tag(name = "DeveloperError", description = "Developer Console Error Monitoring")
public class DeveloperErrorController {

    private final DeveloperErrorService developerErrorService;

    @GetMapping
    @Operation(summary = "Error 목록", description = "Frontend/Backend error를 통합 조회합니다.")
    public DeveloperErrorPageResponse list(
            @RequestParam(required = false) DeveloperErrorSource source,
            @RequestParam(required = false) Integer status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(required = false) String requestId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        return developerErrorService.list(source, status, from, to, requestId, search, page, size);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Error 상세", description = "frontend-{id} 또는 backend-{id} 형식")
    public DeveloperErrorDetailResponse detail(@PathVariable String id) {
        return developerErrorService.getDetail(id);
    }
}
