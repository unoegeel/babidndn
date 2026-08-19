package com.gdgoc.babi_order.httprequest.entity;

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
        name = "http_request_records",
        indexes = {
                @Index(name = "idx_http_request_records_created_at", columnList = "created_at"),
                @Index(name = "idx_http_request_records_request_id", columnList = "request_id"),
                @Index(name = "idx_http_request_records_status", columnList = "status"),
                @Index(name = "idx_http_request_records_path", columnList = "path")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class HttpRequestRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_id", nullable = false, length = 64)
    private String requestId;

    @Column(nullable = false, length = 10)
    private String method;

    @Column(nullable = false, length = 500)
    private String path;

    @Column(nullable = false)
    private int status;

    @Column(name = "duration_ms", nullable = false)
    private long durationMs;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public HttpRequestRecord(
            String requestId,
            String method,
            String path,
            int status,
            long durationMs,
            String userAgent
    ) {
        this.requestId = requestId;
        this.method = method;
        this.path = path;
        this.status = status;
        this.durationMs = durationMs;
        this.userAgent = userAgent;
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
