package com.gdgoc.babi_order.payment.reconciliation.entity;

import com.gdgoc.babi_order.payment.reconciliation.ReconciliationIssueStatus;
import com.gdgoc.babi_order.payment.reconciliation.ReconciliationIssueType;
import com.gdgoc.babi_order.payment.reconciliation.ReconciliationSeverity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "payment_reconciliation_issues",
        uniqueConstraints = @UniqueConstraint(name = "uk_recon_active_key", columnNames = "active_key"),
        indexes = {
                @Index(name = "idx_recon_status_last_detected", columnList = "status, last_detected_at"),
                @Index(name = "idx_recon_order_id", columnList = "order_id"),
                @Index(name = "idx_recon_payment_id", columnList = "payment_id"),
                @Index(name = "idx_recon_logical_key", columnList = "logical_key")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PaymentReconciliationIssue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "logical_key", nullable = false, length = 191)
    private String logicalKey;

    /** OPEN일 때 logicalKey와 동일. RESOLVED면 NULL (UNIQUE nullable 다중 허용). */
    @Column(name = "active_key", length = 191)
    private String activeKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "issue_type", nullable = false, length = 64)
    private ReconciliationIssueType issueType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReconciliationSeverity severity;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "payment_id")
    private Long paymentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReconciliationIssueStatus status;

    @Column(nullable = false, length = 500)
    private String message;

    @Column(columnDefinition = "TEXT")
    private String metadata;

    @Column(name = "first_detected_at", nullable = false)
    private LocalDateTime firstDetectedAt;

    @Column(name = "last_detected_at", nullable = false)
    private LocalDateTime lastDetectedAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "occurrence_count", nullable = false)
    private Long occurrenceCount;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public static PaymentReconciliationIssue open(
            String logicalKey,
            ReconciliationIssueType issueType,
            ReconciliationSeverity severity,
            Long orderId,
            Long paymentId,
            String message,
            String metadata,
            LocalDateTime detectedAt
    ) {
        PaymentReconciliationIssue issue = new PaymentReconciliationIssue();
        issue.logicalKey = logicalKey;
        issue.activeKey = logicalKey;
        issue.issueType = issueType;
        issue.severity = severity;
        issue.orderId = orderId;
        issue.paymentId = paymentId;
        issue.status = ReconciliationIssueStatus.OPEN;
        issue.message = truncate(message, 500);
        issue.metadata = metadata;
        issue.firstDetectedAt = detectedAt;
        issue.lastDetectedAt = detectedAt;
        issue.occurrenceCount = 1L;
        return issue;
    }

    public void touch(LocalDateTime detectedAt, String message, String metadata) {
        this.lastDetectedAt = detectedAt;
        this.occurrenceCount = this.occurrenceCount + 1;
        this.message = truncate(message, 500);
        this.metadata = metadata;
    }

    public void resolve(LocalDateTime resolvedAt) {
        this.status = ReconciliationIssueStatus.RESOLVED;
        this.activeKey = null;
        this.resolvedAt = resolvedAt;
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    private static String truncate(String value, int max) {
        if (value == null) {
            return "";
        }
        return value.length() <= max ? value : value.substring(0, max);
    }
}
