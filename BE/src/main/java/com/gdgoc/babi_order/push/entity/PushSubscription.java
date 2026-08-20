package com.gdgoc.babi_order.push.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(
        name = "push_subscriptions",
        uniqueConstraints = @UniqueConstraint(name = "uk_push_endpoint", columnNames = "endpoint")
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PushSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 1024)
    private String endpoint;

    @Column(name = "p256dh", nullable = false, length = 255)
    private String p256dh;

    @Column(nullable = false, length = 255)
    private String auth;

    /** @deprecated 단일 주문 연결용. {@link #orderIds}로 이전 중 */
    @Column(name = "order_id")
    private Long orderId;

    /**
     * 준비완료 알림을 받을 주문 ID 목록.
     * 한 기기에서 여러 주문을 해도 이전 주문 연결을 덮어쓰지 않습니다.
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
            name = "push_subscription_orders",
            joinColumns = @JoinColumn(name = "subscription_id"),
            uniqueConstraints = @UniqueConstraint(
                    name = "uk_push_sub_order",
                    columnNames = {"subscription_id", "order_id"}
            )
    )
    @Column(name = "order_id", nullable = false)
    private Set<Long> orderIds = new HashSet<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public PushSubscription(String endpoint, String p256dh, String auth) {
        this.endpoint = endpoint;
        this.p256dh = p256dh;
        this.auth = auth;
    }

    public void updateKeys(String p256dh, String auth) {
        this.p256dh = p256dh;
        this.auth = auth;
    }

    public void linkOrder(Long orderId) {
        if (orderId == null) {
            return;
        }
        this.orderId = orderId;
        this.orderIds.add(orderId);
    }

    @PostLoad
    void migrateLegacyOrderId() {
        if (this.orderId != null) {
            this.orderIds.add(this.orderId);
        }
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
}
