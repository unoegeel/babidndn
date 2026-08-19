package com.gdgoc.babi_order.dev.event;

import com.gdgoc.babi_order.clientevent.ClientEventType;
import com.gdgoc.babi_order.dev.event.dto.DeveloperEventDetailResponse;
import com.gdgoc.babi_order.dev.event.dto.DeveloperEventPageResponse;
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
@RequestMapping("/api/dev/events")
@RequiredArgsConstructor
@Tag(name = "DeveloperEvent", description = "Developer Console User Event Monitoring")
public class DeveloperEventController {

    private final DeveloperEventService developerEventService;

    @GetMapping
    @Operation(summary = "User Event 목록", description = "client_events 기록을 조회합니다.")
    public DeveloperEventPageResponse list(
            @RequestParam(required = false) ClientEventType eventType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(required = false) String route,
            @RequestParam(required = false) String anonymousId,
            @RequestParam(required = false) String sessionId,
            @RequestParam(required = false) String relatedRequestId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        return developerEventService.list(
                eventType, from, to, route, anonymousId, sessionId, relatedRequestId, page, size
        );
    }

    @GetMapping("/{id}")
    @Operation(summary = "User Event 상세")
    public DeveloperEventDetailResponse detail(@PathVariable long id) {
        return developerEventService.getDetail(id);
    }
}
