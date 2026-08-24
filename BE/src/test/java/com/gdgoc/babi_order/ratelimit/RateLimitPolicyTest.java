package com.gdgoc.babi_order.ratelimit;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;

import static org.assertj.core.api.Assertions.assertThat;

class RateLimitPolicyTest {

    @Test
    void matchesTargetedPostsOnly() {
        assertThat(RateLimitPolicy.match(HttpMethod.POST, "/api/orders"))
                .isEqualTo(RateLimitPolicy.ORDER_CREATE);
        assertThat(RateLimitPolicy.match(HttpMethod.POST, "/api/payments/confirm"))
                .isEqualTo(RateLimitPolicy.PAYMENT_CONFIRM);
        assertThat(RateLimitPolicy.match(HttpMethod.POST, "/api/inquiries"))
                .isEqualTo(RateLimitPolicy.CONTACT);
        assertThat(RateLimitPolicy.match(HttpMethod.POST, "/api/client-errors"))
                .isEqualTo(RateLimitPolicy.CLIENT_ERRORS);
        assertThat(RateLimitPolicy.match(HttpMethod.POST, "/api/client-events"))
                .isEqualTo(RateLimitPolicy.CLIENT_EVENTS);
        assertThat(RateLimitPolicy.match(HttpMethod.POST, "/api/admin/auth/login"))
                .isEqualTo(RateLimitPolicy.AUTH_LOGIN);
    }

    @Test
    void doesNotMatchExcludedPaths() {
        assertThat(RateLimitPolicy.match(HttpMethod.GET, "/api/orders/1")).isNull();
        assertThat(RateLimitPolicy.match(HttpMethod.GET, "/api/orders")).isNull();
        assertThat(RateLimitPolicy.match(HttpMethod.OPTIONS, "/api/orders")).isNull();
        assertThat(RateLimitPolicy.match(HttpMethod.POST, "/api/payments/webhook")).isNull();
        assertThat(RateLimitPolicy.match(HttpMethod.POST, "/api/dev/reconciliation/scan")).isNull();
        assertThat(RateLimitPolicy.match(HttpMethod.POST, "/api/orders/1/call")).isNull();
        assertThat(RateLimitPolicy.match(HttpMethod.GET, "/api/orders/stream")).isNull();
    }
}
