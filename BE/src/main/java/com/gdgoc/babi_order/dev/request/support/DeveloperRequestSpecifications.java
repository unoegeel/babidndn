package com.gdgoc.babi_order.dev.request.support;

import com.gdgoc.babi_order.httprequest.entity.HttpRequestRecord;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;

public final class DeveloperRequestSpecifications {

    private DeveloperRequestSpecifications() {
    }

    public static Specification<HttpRequestRecord> filter(
            String requestId,
            String method,
            Integer status,
            String path,
            Instant from,
            Instant to,
            Long minDuration,
            Long maxDuration
    ) {
        return (root, query, cb) -> {
            var predicates = cb.conjunction();

            if (requestId != null && !requestId.isBlank()) {
                predicates = cb.and(predicates, cb.equal(root.get("requestId"), requestId.trim()));
            }
            if (method != null && !method.isBlank()) {
                predicates = cb.and(predicates, cb.equal(cb.upper(root.get("method")), method.trim().toUpperCase()));
            }
            if (status != null) {
                predicates = cb.and(predicates, cb.equal(root.get("status"), status));
            }
            if (path != null && !path.isBlank()) {
                predicates = cb.and(predicates, cb.like(root.get("path"), "%" + path.trim() + "%"));
            }
            if (from != null) {
                predicates = cb.and(predicates, cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            }
            if (to != null) {
                predicates = cb.and(predicates, cb.lessThanOrEqualTo(root.get("createdAt"), to));
            }
            if (minDuration != null) {
                predicates = cb.and(predicates, cb.greaterThanOrEqualTo(root.get("durationMs"), minDuration));
            }
            if (maxDuration != null) {
                predicates = cb.and(predicates, cb.lessThanOrEqualTo(root.get("durationMs"), maxDuration));
            }
            return predicates;
        };
    }
}
