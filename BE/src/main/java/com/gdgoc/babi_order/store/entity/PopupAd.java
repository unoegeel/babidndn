package com.gdgoc.babi_order.store.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "popup_ads")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PopupAd {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    @Column(name = "start_at", nullable = false)
    private LocalDateTime startAt;

    @Column(name = "end_at", nullable = false)
    private LocalDateTime endAt;

    @Column(nullable = false)
    private Boolean enabled;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    public PopupAd(String imageUrl, LocalDateTime startAt, LocalDateTime endAt, Boolean enabled) {
        this.imageUrl = imageUrl;
        this.startAt = startAt;
        this.endAt = endAt;
        this.enabled = enabled != null ? enabled : true;
    }

    public void update(String imageUrl, LocalDateTime startAt, LocalDateTime endAt, Boolean enabled) {
        this.imageUrl = imageUrl;
        this.startAt = startAt;
        this.endAt = endAt;
        if (enabled != null) {
            this.enabled = enabled;
        }
    }

    public void disable() {
        this.enabled = false;
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.enabled == null) {
            this.enabled = true;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
