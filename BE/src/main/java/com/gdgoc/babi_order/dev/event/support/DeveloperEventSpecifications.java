package com.gdgoc.babi_order.dev.event.support;

import com.gdgoc.babi_order.clientevent.ClientEventType;
import com.gdgoc.babi_order.clientevent.entity.ClientEvent;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;

public final class DeveloperEventSpecifications {

    private DeveloperEventSpecifications() {
    }

    public static Specification<ClientEvent> filter(
            ClientEventType eventType,
            Instant from,
            Instant to,
            String route,
            String anonymousId,
            String sessionId,
            String relatedRequestId
    ) {
        return (root, query, cb) -> {
            var predicates = cb.conjunction();

            if (eventType != null) {
                predicates = cb.and(predicates, cb.equal(root.get("eventType"), eventType));
            }
            if (from != null) {
                predicates = cb.and(predicates, cb.greaterThanOrEqualTo(root.get("occurredAt"), from));
            }
            if (to != null) {
                predicates = cb.and(predicates, cb.lessThanOrEqualTo(root.get("occurredAt"), to));
            }
            if (route != null && !route.isBlank()) {
                predicates = cb.and(predicates, cb.like(root.get("route"), "%" + route.trim() + "%"));
            }
            if (anonymousId != null && !anonymousId.isBlank()) {
                predicates = cb.and(predicates, cb.equal(root.get("anonymousId"), anonymousId.trim()));
            }
            if (sessionId != null && !sessionId.isBlank()) {
                predicates = cb.and(predicates, cb.equal(root.get("sessionId"), sessionId.trim()));
            }
            if (relatedRequestId != null && !relatedRequestId.isBlank()) {
                predicates = cb.and(predicates, cb.equal(root.get("relatedRequestId"), relatedRequestId.trim()));
            }
            return predicates;
        };
    }
}
