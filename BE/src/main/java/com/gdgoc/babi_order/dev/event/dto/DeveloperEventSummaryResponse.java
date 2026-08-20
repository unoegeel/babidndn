package com.gdgoc.babi_order.dev.event.dto;

import com.gdgoc.babi_order.clientevent.ClientEventType;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;

@Getter
@Builder
public class DeveloperEventSummaryResponse {

    private Long id;
    private String eventId;
    private ClientEventType eventType;
    private Instant occurredAt;
    private String anonymousId;
    private String sessionId;
    private String route;
    private String relatedRequestId;
}
