package com.gdgoc.babi_order.ratelimit;

import lombok.Getter;
import org.springframework.http.HttpMethod;

/**
 * Isolated rate-limit policies. Each policy has its own buckets (policy + identity).
 */
@Getter
public enum RateLimitPolicy {
    ORDER_CREATE("order-create", true),
    PAYMENT_CONFIRM("payment-confirm", true),
    CONTACT("contact", true),
    CLIENT_ERRORS("client-errors", true),
    CLIENT_EVENTS("client-events", true),
    /** Shared Admin+Developer login endpoint — IP only. */
    AUTH_LOGIN("auth-login", false);

    private final String configKey;
    private final boolean clientBucketEnabled;

    RateLimitPolicy(String configKey, boolean clientBucketEnabled) {
        this.configKey = configKey;
        this.clientBucketEnabled = clientBucketEnabled;
    }

    public static RateLimitPolicy match(HttpMethod method, String path) {
        if (method != HttpMethod.POST || path == null) {
            return null;
        }
        return switch (path) {
            case "/api/orders" -> ORDER_CREATE;
            case "/api/payments/confirm" -> PAYMENT_CONFIRM;
            case "/api/inquiries" -> CONTACT;
            case "/api/client-errors" -> CLIENT_ERRORS;
            case "/api/client-events" -> CLIENT_EVENTS;
            case "/api/admin/auth/login" -> AUTH_LOGIN;
            default -> null;
        };
    }
}
