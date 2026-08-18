package com.gdgoc.babi_order.savedmenu.entity;

import com.gdgoc.babi_order.menu.entity.Menu;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Entity
@Table(
        name = "saved_menus",
        indexes = {
                @Index(name = "idx_saved_menus_client_key", columnList = "client_key"),
                @Index(name = "idx_saved_menus_client_created", columnList = "client_key, created_at")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SavedMenu {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "client_key", nullable = false, length = 64)
    private String clientKey;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "menu_id")
    private Menu menu;

    @Column(name = "custom_name", nullable = false, length = 100)
    private String customName;

    @Column(name = "menu_name_snapshot", nullable = false, length = 100)
    private String menuNameSnapshot;

    @Column(name = "menu_image_url_snapshot", length = 255)
    private String menuImageUrlSnapshot;

    @Column(name = "menu_price_snapshot", nullable = false)
    private Integer menuPriceSnapshot;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "savedMenu", cascade = CascadeType.ALL, orphanRemoval = true)
    private final List<SavedMenuOption> options = new ArrayList<>();

    public SavedMenu(
            String clientKey,
            Menu menu,
            String customName,
            String menuNameSnapshot,
            String menuImageUrlSnapshot,
            Integer menuPriceSnapshot
    ) {
        this.clientKey = clientKey;
        this.menu = menu;
        this.customName = customName;
        this.menuNameSnapshot = menuNameSnapshot;
        this.menuImageUrlSnapshot = menuImageUrlSnapshot;
        this.menuPriceSnapshot = menuPriceSnapshot;
    }

    public void addOption(SavedMenuOption option) {
        options.add(option);
        option.assignSavedMenu(this);
    }

    public void replaceOptions(List<SavedMenuOption> nextOptions) {
        options.clear();
        for (SavedMenuOption option : nextOptions) {
            addOption(option);
        }
    }

    public void changeCustomName(String customName) {
        this.customName = customName;
    }

    public void refreshMenuSnapshot(Menu menu) {
        this.menu = menu;
        this.menuNameSnapshot = menu.getName();
        this.menuImageUrlSnapshot = menu.getImageUrl();
        this.menuPriceSnapshot = menu.getBasePrice();
    }

    public List<SavedMenuOption> getOptions() {
        return Collections.unmodifiableList(options);
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
