package com.gdgoc.babi_order.clientevent.entity;

import com.gdgoc.babi_order.clientevent.ClientEventType;
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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;

@Entity
@Table(
        name = "client_events",
        indexes = {
                @Index(name = "idx_client_events_event_type", columnList = "event_type"),
                @Index(name = "idx_client_events_occurred_at", columnList = "occurred_at"),
                @Index(name = "idx_client_events_anonymous_id", columnList = "anonymous_id"),
                @Index(name = "idx_client_events_session_id", columnList = "session_id")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ClientEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false, unique = true, length = 64)
    private String eventId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 40)
    private ClientEventType eventType;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @Column(name = "anonymous_id", nullable = false, length = 64)
    private String anonymousId;

    @Column(name = "session_id", nullable = false, length = 64)
    private String sessionId;

    @Column(nullable = false, length = 500)
    private String route;

    @Column(name = "related_request_id", length = 64)
    private String relatedRequestId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "json")
    private Map<String, Object> metadata;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public ClientEvent(
            String eventId,
            ClientEventType eventType,
            Instant occurredAt,
            String anonymousId,
            String sessionId,
            String route,
            String relatedRequestId,
            Map<String, Object> metadata
    ) {
        this.eventId = eventId;
        this.eventType = eventType;
        this.occurredAt = occurredAt;
        this.anonymousId = anonymousId;
        this.sessionId = sessionId;
        this.route = route;
        this.relatedRequestId = relatedRequestId;
        this.metadata = metadata;
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
