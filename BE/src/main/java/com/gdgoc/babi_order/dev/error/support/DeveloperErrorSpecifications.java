package com.gdgoc.babi_order.dev.error.support;

import com.gdgoc.babi_order.backenderror.entity.BackendError;
import com.gdgoc.babi_order.clienterror.entity.ClientError;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;

public final class DeveloperErrorSpecifications {

    private DeveloperErrorSpecifications() {
    }

    public static Specification<ClientError> clientErrors(
            Instant from,
            Instant to,
            String requestId,
            String search
    ) {
        return (root, query, cb) -> {
            var predicates = cb.conjunction();

            if (from != null) {
                predicates = cb.and(predicates, cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            }
            if (to != null) {
                predicates = cb.and(predicates, cb.lessThanOrEqualTo(root.get("createdAt"), to));
            }
            if (requestId != null && !requestId.isBlank()) {
                String trimmed = requestId.trim();
                predicates = cb.and(predicates, cb.or(
                        cb.equal(root.get("trackingRequestId"), trimmed),
                        cb.equal(root.get("relatedRequestId"), trimmed)
                ));
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                predicates = cb.and(predicates, cb.or(
                        cb.like(cb.lower(root.get("message")), pattern),
                        cb.like(cb.lower(root.get("route")), pattern),
                        cb.like(cb.lower(root.get("trackingRequestId")), pattern),
                        cb.like(cb.lower(root.get("relatedRequestId")), pattern),
                        cb.like(cb.lower(root.get("errorName")), pattern)
                ));
            }
            return predicates;
        };
    }

    public static Specification<BackendError> backendErrors(
            Instant from,
            Instant to,
            Integer status,
            String requestId,
            String search
    ) {
        return (root, query, cb) -> {
            var predicates = cb.conjunction();

            if (from != null) {
                predicates = cb.and(predicates, cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            }
            if (to != null) {
                predicates = cb.and(predicates, cb.lessThanOrEqualTo(root.get("createdAt"), to));
            }
            if (status != null) {
                predicates = cb.and(predicates, cb.equal(root.get("status"), status));
            }
            if (requestId != null && !requestId.isBlank()) {
                predicates = cb.and(predicates, cb.equal(root.get("requestId"), requestId.trim()));
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                predicates = cb.and(predicates, cb.or(
                        cb.like(cb.lower(root.get("message")), pattern),
                        cb.like(cb.lower(root.get("path")), pattern),
                        cb.like(cb.lower(root.get("requestId")), pattern),
                        cb.like(cb.lower(root.get("exceptionClass")), pattern)
                ));
            }
            return predicates;
        };
    }
}
