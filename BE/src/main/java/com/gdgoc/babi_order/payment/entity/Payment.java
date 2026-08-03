package com.gdgoc.babi_order.payment.entity;

import com.gdgoc.babi_order.order.entity.Order;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(name = "toss_order_id", nullable = false, length = 200)
    private String tossOrderId;

    @Column(name = "payment_key", nullable = false, length = 200)
    private String paymentKey;

    @Column(nullable = false)
    private Integer amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentStatus status;

    @Column(name = "cancel_reason", length = 100)
    private String cancelReason;

    @Column(name = "approved_at", nullable = false)
    private LocalDateTime approvedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    public Payment(Order order, String tossOrderId, String paymentKey, Integer amount,
                   PaymentStatus status, LocalDateTime approvedAt) {
        this.order = order;
        this.tossOrderId = tossOrderId;
        this.paymentKey = paymentKey;
        this.amount = amount;
        this.status = status;
        this.approvedAt = approvedAt;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void cancel(String cancelReason) {
        this.status = PaymentStatus.CANCELED;
        this.cancelReason = cancelReason;
    }

    public void syncStatus(PaymentStatus status) {
        this.status = status;
    }
}
