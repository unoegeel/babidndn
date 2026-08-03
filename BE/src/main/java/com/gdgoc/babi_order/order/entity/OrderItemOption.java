package com.gdgoc.babi_order.order.entity;

import com.gdgoc.babi_order.menu.entity.MenuOption;
import com.gdgoc.babi_order.menu.entity.OptionGroupType;
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
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "order_item_options")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OrderItemOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "menu_option_id")
    private MenuOption menuOption;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_item_id", nullable = false)
    private OrderItem orderItem;

    @Enumerated(EnumType.STRING)
    @Column(name = "option_group_snapshot", length = 30)
    private OptionGroupType optionGroupSnapshot;

    @Column(name = "option_name_snapshot", nullable = false, length = 100)
    private String optionNameSnapshot;

    @Column(name = "additional_price_snapshot", nullable = false)
    private Integer additionalPriceSnapshot;

    @Column(nullable = false)
    private Integer quantity;

    public OrderItemOption(MenuOption menuOption, Integer quantity) {
        this.menuOption = menuOption;
        this.optionGroupSnapshot = menuOption.getGroupType();
        this.optionNameSnapshot = menuOption.getName();
        this.additionalPriceSnapshot = menuOption.getAdditionalPrice();
        this.quantity = quantity;
    }

    void assignOrderItem(OrderItem orderItem) {
        this.orderItem = orderItem;
    }
}
