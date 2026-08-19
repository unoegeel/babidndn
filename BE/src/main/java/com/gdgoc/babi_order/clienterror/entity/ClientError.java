package com.gdgoc.babi_order.clienterror.entity;

import com.gdgoc.babi_order.clienterror.ClientErrorSource;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
        name = "client_errors",
        indexes = {
                @Index(name = "idx_client_errors_created_at", columnList = "created_at"),
                @Index(name = "idx_client_errors_tracking_request_id", columnList = "tracking_request_id"),
                @Index(name = "idx_client_errors_related_request_id", columnList = "related_request_id")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ClientError {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** POST /api/client-errors 요청 자체의 requestId */
    @Column(name = "tracking_request_id", length = 64)
    private String trackingRequestId;

    /** 연관 Backend API requestId */
    @Column(name = "related_request_id", length = 64)
    private String relatedRequestId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ClientErrorSource source;

    @Column(name = "error_name", nullable = false, length = 200)
    private String errorName;

    @Column(nullable = false, length = 2000)
    private String message;

    @Column(length = 8000)
    private String stack;

    @Column(name = "component_stack", length = 8000)
    private String componentStack;

    @Column(nullable = false, length = 500)
    private String route;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @Column(length = 100)
    private String browser;

    @Column(length = 100)
    private String platform;

    @Column(name = "reported_at", nullable = false)
    private Instant reportedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public ClientError(
            String trackingRequestId,
            String relatedRequestId,
            ClientErrorSource source,
            String errorName,
            String message,
            String stack,
            String componentStack,
            String route,
            String userAgent,
            String browser,
            String platform,
            Instant reportedAt
    ) {
        this.trackingRequestId = trackingRequestId;
        this.relatedRequestId = relatedRequestId;
        this.source = source;
        this.errorName = errorName;
        this.message = message;
        this.stack = stack;
        this.componentStack = componentStack;
        this.route = route;
        this.userAgent = userAgent;
        this.browser = browser;
        this.platform = platform;
        this.reportedAt = reportedAt;
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
