package com.gdgoc.babi_order.order.entity;

import com.gdgoc.babi_order.menu.entity.Menu;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Entity
@Table(name = "order_items")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "menu_id")
    private Menu menu;

    @Column(name = "menu_name_snapshot", nullable = false, length = 100)
    private String menuNameSnapshot;

    @Column(name = "menu_price_snapshot", nullable = false)
    private Integer menuPriceSnapshot;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "line_amount", nullable = false)
    private Integer lineAmount;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "orderItem", cascade = CascadeType.ALL, orphanRemoval = true)
    private final List<OrderItemOption> options = new ArrayList<>();

    public OrderItem(Menu menu, Integer quantity) {
        this.menu = menu;
        this.menuNameSnapshot = menu.getName();
        this.menuPriceSnapshot = menu.getBasePrice();
        this.quantity = quantity;
        this.lineAmount = menu.getBasePrice() * quantity;
    }

    void assignOrder(Order order) {
        this.order = order;
    }

    public void addOption(OrderItemOption option) {
        options.add(option);
        option.assignOrderItem(this);
        lineAmount += option.getAdditionalPriceSnapshot() * option.getQuantity() * quantity;
    }

    public List<OrderItemOption> getOptions() {
        return Collections.unmodifiableList(options);
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
