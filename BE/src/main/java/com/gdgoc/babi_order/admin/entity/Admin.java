package com.gdgoc.babi_order.admin.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "admins",
        uniqueConstraints = @UniqueConstraint(name = "uk_admin_login_id", columnNames = "login_id")
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Admin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "login_id", nullable = false, length = 100)
    private String loginId;

    @Column(nullable = false, length = 100)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AdminRole role;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public Admin(String loginId, String encodedPassword) {
        this(loginId, encodedPassword, AdminRole.ADMIN);
    }

    public Admin(String loginId, String encodedPassword, AdminRole role) {
        this.loginId = loginId;
        this.password = encodedPassword;
        this.role = role;
    }

    @PrePersist
    protected void onCreate() {
        if (role == null) {
            role = AdminRole.ADMIN;
        }
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    /** ddl-auto 마이그레이션 등으로 role이 null인 기존 행은 ADMIN으로 취급 */
    public AdminRole getRole() {
        return role == null ? AdminRole.ADMIN : role;
    }
}
