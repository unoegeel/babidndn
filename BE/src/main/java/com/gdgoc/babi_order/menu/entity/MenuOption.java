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
@Table(name = "menu_options")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MenuOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "menu_id", nullable = false)
    private Menu menu;

    @Enumerated(EnumType.STRING)
    @Column(name = "group_type", length = 30)
    private OptionGroupType groupType;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "additional_price", nullable = false)
    private Integer additionalPrice;

    @Column(name = "max_quantity", nullable = false)
    private Integer maxQuantity;

    @Column(name = "default_selected", nullable = false)
    @ColumnDefault("false")
    private boolean defaultSelected;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    public MenuOption(Menu menu, OptionGroupType groupType, String name,
                      Integer additionalPrice, Integer maxQuantity,
                      boolean defaultSelected, Integer displayOrder) {
        this.menu = menu;
        this.groupType = groupType;
        this.name = name;
        this.additionalPrice = additionalPrice;
        this.maxQuantity = maxQuantity;
        this.defaultSelected = defaultSelected;
        this.displayOrder = displayOrder;
    }

    public void update(OptionGroupType groupType, String name, Integer additionalPrice,
                       Integer maxQuantity, boolean defaultSelected, Integer displayOrder) {
        this.groupType = groupType;
        this.name = name;
        this.additionalPrice = additionalPrice;
        this.maxQuantity = maxQuantity;
        this.defaultSelected = defaultSelected;
        this.displayOrder = displayOrder;
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
