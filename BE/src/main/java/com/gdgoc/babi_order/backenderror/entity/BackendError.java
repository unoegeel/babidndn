package com.gdgoc.babi_order.backenderror.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(
        name = "backend_errors",
        indexes = {
                @Index(name = "idx_backend_errors_created_at", columnList = "created_at"),
                @Index(name = "idx_backend_errors_request_id", columnList = "request_id"),
                @Index(name = "idx_backend_errors_status", columnList = "status")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BackendError {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_id", length = 64)
    private String requestId;

    @Column(length = 10)
    private String method;

    @Column(nullable = false, length = 500)
    private String path;

    @Column(nullable = false)
    private int status;

    @Column(name = "exception_class", nullable = false, length = 255)
    private String exceptionClass;

    @Column(nullable = false, length = 2000)
    private String message;

    @Column(name = "stack_trace", length = 8000)
    private String stackTrace;

    @Column(name = "duration_ms")
    private Long durationMs;

    @Column(length = 100)
    private String principal;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public BackendError(
            String requestId,
            String method,
            String path,
            int status,
            String exceptionClass,
            String message,
            String stackTrace,
            Long durationMs,
            String principal
    ) {
        this.requestId = requestId;
        this.method = method;
        this.path = path;
        this.status = status;
        this.exceptionClass = exceptionClass;
        this.message = message;
        this.stackTrace = stackTrace;
        this.durationMs = durationMs;
        this.principal = principal;
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
