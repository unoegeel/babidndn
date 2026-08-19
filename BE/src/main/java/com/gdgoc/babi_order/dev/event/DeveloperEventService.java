package com.gdgoc.babi_order.dev.event;

import com.gdgoc.babi_order.clientevent.ClientEventType;
import com.gdgoc.babi_order.clientevent.entity.ClientEvent;
import com.gdgoc.babi_order.clientevent.repository.ClientEventRepository;
import com.gdgoc.babi_order.common.exception.ApiException;
import com.gdgoc.babi_order.dev.event.dto.DeveloperEventDetailResponse;
import com.gdgoc.babi_order.dev.event.dto.DeveloperEventPageResponse;
import com.gdgoc.babi_order.dev.event.dto.DeveloperEventSummaryResponse;
import com.gdgoc.babi_order.dev.event.support.DeveloperEventSpecifications;
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
public class DeveloperEventService {

    private final ClientEventRepository clientEventRepository;

    public DeveloperEventPageResponse list(
            ClientEventType eventType,
            Instant from,
            Instant to,
            String route,
            String anonymousId,
            String sessionId,
            String relatedRequestId,
            int page,
            int size
    ) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);

        Specification<ClientEvent> spec = DeveloperEventSpecifications.filter(
                eventType, from, to, route, anonymousId, sessionId, relatedRequestId
        );
        Page<ClientEvent> result = clientEventRepository.findAll(
                spec,
                PageRequest.of(
                        safePage,
                        safeSize,
                        Sort.by(Sort.Order.desc("occurredAt"), Sort.Order.desc("id"))
                )
        );

        return DeveloperEventPageResponse.builder()
                .content(result.getContent().stream().map(this::toSummary).toList())
                .page(safePage)
                .size(safeSize)
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build();
    }

    public DeveloperEventDetailResponse getDetail(long id) {
        ClientEvent event = clientEventRepository.findById(id)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "EVENT_NOT_FOUND",
                        "이벤트 기록을 찾을 수 없습니다."
                ));
        return toDetail(event);
    }

    private DeveloperEventSummaryResponse toSummary(ClientEvent event) {
        return DeveloperEventSummaryResponse.builder()
                .id(event.getId())
                .eventId(event.getEventId())
                .eventType(event.getEventType())
                .occurredAt(event.getOccurredAt())
                .anonymousId(event.getAnonymousId())
                .sessionId(event.getSessionId())
                .route(event.getRoute())
                .relatedRequestId(event.getRelatedRequestId())
                .build();
    }

    private DeveloperEventDetailResponse toDetail(ClientEvent event) {
        return DeveloperEventDetailResponse.builder()
                .id(event.getId())
                .eventId(event.getEventId())
                .eventType(event.getEventType())
                .occurredAt(event.getOccurredAt())
                .anonymousId(event.getAnonymousId())
                .sessionId(event.getSessionId())
                .route(event.getRoute())
                .relatedRequestId(event.getRelatedRequestId())
                .metadata(event.getMetadata())
                .build();
    }
}
