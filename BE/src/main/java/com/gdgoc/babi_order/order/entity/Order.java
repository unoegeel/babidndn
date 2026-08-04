package com.gdgoc.babi_order.order.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.ColumnDefault;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "orders")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Order {

    /** 결제 완료 전 임시 주문 — 픽업번호 미발급 */
    public static final int UNASSIGNED_PICKUP_NUMBER = 0;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "pickup_number", nullable = false)
    private Integer pickupNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @ColumnDefault("'PREPARING'")
    private OrderStatus status;

    @Column(name = "total_amount", nullable = false)
    private Integer totalAmount;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private final List<OrderItem> items = new ArrayList<>();

    public Order(Integer pickupNumber) {
        this.pickupNumber = pickupNumber;
        this.status = OrderStatus.PREPARING;
        this.totalAmount = 0;
    }

    public void addItem(OrderItem item) {
        items.add(item);
        item.assignOrder(this);
        totalAmount += item.getLineAmount();
    }

    public List<OrderItem> getItems() {
        return Collections.unmodifiableList(items);
    }

    public void changeStatus(OrderStatus nextStatus) {
        this.status = nextStatus;
    }

    public boolean hasPickupNumber() {
        return pickupNumber != null && pickupNumber > UNASSIGNED_PICKUP_NUMBER;
    }

    public void assignPickupNumber(int pickupNumber) {
        this.pickupNumber = pickupNumber;
    }

    // Toss 샌드박스는 orderId 유일성을 전체 테스트 계정 간에 공유하므로,
    // PK를 0-패딩한 뒤 랜덤 접미사를 붙여 다른 계정과의 충돌을 피한다.
    public String getTossOrderId() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return String.format("%06d", id) + "-" + suffix;
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
