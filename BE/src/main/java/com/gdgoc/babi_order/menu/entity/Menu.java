package com.gdgoc.babi_order.menu.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.ColumnDefault;

import java.time.LocalDateTime;

@Entity
@Table(name = "menus")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Menu {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(name = "base_price", nullable = false)
    private Integer basePrice;

    @Column(name = "image_url", length = 255)
    private String imageUrl;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    @Enumerated(EnumType.STRING)
    @Column(name = "sale_status", nullable = false, length = 20)
    @ColumnDefault("'AVAILABLE'")
    private SaleStatus saleStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "badge", nullable = false, length = 20)
    @ColumnDefault("'NONE'")
    private MenuBadge badge;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    public Menu(Category category, String name, String description, Integer basePrice,
                String imageUrl, Integer displayOrder, SaleStatus saleStatus, MenuBadge badge) {
        this.category = category;
        this.name = name;
        this.description = description;
        this.basePrice = basePrice;
        this.imageUrl = imageUrl;
        this.displayOrder = displayOrder;
        this.saleStatus = saleStatus == null ? SaleStatus.AVAILABLE : saleStatus;
        this.badge = badge == null ? MenuBadge.NONE : badge;
    }

    public void update(Category category, String name, String description, Integer basePrice,
                       String imageUrl, Integer displayOrder, SaleStatus saleStatus, MenuBadge badge) {
        this.category = category;
        this.name = name;
        this.description = description;
        this.basePrice = basePrice;
        this.imageUrl = imageUrl;
        this.displayOrder = displayOrder;
        this.saleStatus = saleStatus;
        this.badge = badge == null ? MenuBadge.NONE : badge;
    }

    public void changeDisplayOrder(Integer displayOrder) {
        this.displayOrder = displayOrder;
    }

    public void changeSaleStatus(SaleStatus saleStatus) {
        this.saleStatus = saleStatus;
    }

    @PrePersist
    protected void onCreate() {
        if (this.badge == null) {
            this.badge = MenuBadge.NONE;
        }
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
