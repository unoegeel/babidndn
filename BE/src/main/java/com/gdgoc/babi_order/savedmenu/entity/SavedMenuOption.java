package com.gdgoc.babi_order.savedmenu.entity;

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
@Table(name = "saved_menu_options")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SavedMenuOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "saved_menu_id", nullable = false)
    private SavedMenu savedMenu;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "menu_option_id")
    private MenuOption menuOption;

    @Column(name = "option_name_snapshot", nullable = false, length = 100)
    private String optionNameSnapshot;

    @Enumerated(EnumType.STRING)
    @Column(name = "option_group_snapshot", length = 30)
    private OptionGroupType optionGroupSnapshot;

    @Column(name = "additional_price_snapshot", nullable = false)
    private Integer additionalPriceSnapshot;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "display_order_snapshot", nullable = false)
    private Integer displayOrderSnapshot;

    public SavedMenuOption(MenuOption menuOption, Integer quantity) {
        this.menuOption = menuOption;
        this.optionNameSnapshot = menuOption.getName();
        this.optionGroupSnapshot = menuOption.getGroupType();
        this.additionalPriceSnapshot = menuOption.getAdditionalPrice();
        this.quantity = quantity;
        this.displayOrderSnapshot = menuOption.getDisplayOrder() == null ? 1 : menuOption.getDisplayOrder();
    }

    void assignSavedMenu(SavedMenu savedMenu) {
        this.savedMenu = savedMenu;
    }
}
