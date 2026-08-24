package com.gdgoc.babi_order.ratelimit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RateLimitServiceTest {

    private MutableClock clock;
    private RateLimitService service;
    private RateLimitProperties properties;

    @BeforeEach
    void setUp() {
        clock = new MutableClock(Instant.parse("2026-08-24T00:00:00Z"));
        properties = new RateLimitProperties();
        properties.setEnabled(true);
        properties.setCacheMaximumSize(10_000);
        properties.setTrustedProxies(List.of("127.0.0.1"));
        Map<String, RateLimitProperties.PolicyLimits> policies = new LinkedHashMap<>();
        policies.put("order-create", limits(2, 60, 2, 60));
        policies.put("client-events", limits(5, 60, 100, 60));
        policies.put("auth-login", limits(0, 0, 2, 300));
        properties.setPolicies(policies);

        ClientIpResolver ipResolver = new ClientIpResolver(properties);
        service = new RateLimitService(properties, ipResolver, clock);
        service.initCache();
    }

    @Test
    void allowsUntilThresholdThen429WithRetryAfter() {
        MockHttpServletRequest request = baseRequest("203.0.113.1", null);
        service.check(RateLimitPolicy.ORDER_CREATE, request);
        service.check(RateLimitPolicy.ORDER_CREATE, request);

        assertThatThrownBy(() -> service.check(RateLimitPolicy.ORDER_CREATE, request))
                .isInstanceOf(RateLimitExceededException.class)
                .satisfies(ex -> {
                    RateLimitExceededException limited = (RateLimitExceededException) ex;
                    assertThat(limited.getCode()).isEqualTo(RateLimitExceededException.CODE);
                    assertThat(limited.getRetryAfterSeconds()).isGreaterThanOrEqualTo(1L);
                });
    }

    @Test
    void windowExpiryAllowsAgain() {
        MockHttpServletRequest request = baseRequest("203.0.113.2", null);
        service.check(RateLimitPolicy.ORDER_CREATE, request);
        service.check(RateLimitPolicy.ORDER_CREATE, request);
        assertThatThrownBy(() -> service.check(RateLimitPolicy.ORDER_CREATE, request))
                .isInstanceOf(RateLimitExceededException.class);

        clock.advanceSeconds(61);
        service.check(RateLimitPolicy.ORDER_CREATE, request);
    }

    @Test
    void clientBucketAppliesWithValidKey() {
        String key = UUID.randomUUID().toString();
        MockHttpServletRequest request = baseRequest("203.0.113.3", key);
        service.check(RateLimitPolicy.ORDER_CREATE, request);
        service.check(RateLimitPolicy.ORDER_CREATE, request);

        assertThatThrownBy(() -> service.check(RateLimitPolicy.ORDER_CREATE, request))
                .isInstanceOf(RateLimitExceededException.class);
    }

    @Test
    void rotatingClientKeysStillHitSharedIpCeiling() {
        // IP limit=2: two different keys share IP, third request blocked by IP bucket
        MockHttpServletRequest first = baseRequest("203.0.113.4", UUID.randomUUID().toString());
        MockHttpServletRequest second = baseRequest("203.0.113.4", UUID.randomUUID().toString());
        MockHttpServletRequest third = baseRequest("203.0.113.4", UUID.randomUUID().toString());

        service.check(RateLimitPolicy.ORDER_CREATE, first);
        service.check(RateLimitPolicy.ORDER_CREATE, second);

        assertThatThrownBy(() -> service.check(RateLimitPolicy.ORDER_CREATE, third))
                .isInstanceOf(RateLimitExceededException.class);
    }

    @Test
    void missingClientKeyStillIpLimited() {
        MockHttpServletRequest request = baseRequest("203.0.113.5", null);
        service.check(RateLimitPolicy.ORDER_CREATE, request);
        service.check(RateLimitPolicy.ORDER_CREATE, request);

        assertThatThrownBy(() -> service.check(RateLimitPolicy.ORDER_CREATE, request))
                .isInstanceOf(RateLimitExceededException.class);
    }

    @Test
    void oversizedClientKeyFallsBackToIpOnly() {
        String oversized = "x".repeat(100);
        MockHttpServletRequest request = baseRequest("203.0.113.6", oversized);
        assertThat(RateLimitClientIdentity.hashIfValid(oversized)).isNull();

        service.check(RateLimitPolicy.ORDER_CREATE, request);
        service.check(RateLimitPolicy.ORDER_CREATE, request);
        assertThatThrownBy(() -> service.check(RateLimitPolicy.ORDER_CREATE, request))
                .isInstanceOf(RateLimitExceededException.class);
    }

    @Test
    void policyBucketsAreIsolated() {
        MockHttpServletRequest request = baseRequest("203.0.113.7", UUID.randomUUID().toString());
        for (int i = 0; i < 5; i++) {
            service.check(RateLimitPolicy.CLIENT_EVENTS, request);
        }
        // order-create untouched
        service.check(RateLimitPolicy.ORDER_CREATE, request);
        service.check(RateLimitPolicy.ORDER_CREATE, request);
    }

    @Test
    void authLoginWindowUsesConfiguredDurationThenAllowsAgain() {
        MockHttpServletRequest request = baseRequest("203.0.113.20", null);
        service.check(RateLimitPolicy.AUTH_LOGIN, request);
        service.check(RateLimitPolicy.AUTH_LOGIN, request);
        assertThatThrownBy(() -> service.check(RateLimitPolicy.AUTH_LOGIN, request))
                .isInstanceOf(RateLimitExceededException.class)
                .satisfies(ex -> assertThat(((RateLimitExceededException) ex).getRetryAfterSeconds())
                        .isLessThanOrEqualTo(300L));

        clock.advanceSeconds(301);
        service.check(RateLimitPolicy.AUTH_LOGIN, request);
    }


    @Test
    void disabledSkipsLimiting() {
        properties.setEnabled(false);
        MockHttpServletRequest request = baseRequest("203.0.113.9", null);
        for (int i = 0; i < 20; i++) {
            service.check(RateLimitPolicy.ORDER_CREATE, request);
        }
    }

    private static MockHttpServletRequest baseRequest(String ip, String clientKey) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr(ip);
        if (clientKey != null) {
            request.addHeader(RateLimitClientIdentity.headerName(), clientKey);
        }
        return request;
    }

    private static RateLimitProperties.PolicyLimits limits(
            int clientLimit,
            int clientWindow,
            int ipLimit,
            int ipWindow
    ) {
        RateLimitProperties.PolicyLimits limits = new RateLimitProperties.PolicyLimits();
        limits.setClientLimit(clientLimit);
        limits.setClientWindowSeconds(clientWindow);
        limits.setIpLimit(ipLimit);
        limits.setIpWindowSeconds(ipWindow);
        return limits;
    }

    static final class MutableClock extends Clock {
        private final AtomicReference<Instant> instant;
        private final ZoneOffset zone = ZoneOffset.UTC;

        MutableClock(Instant initial) {
            this.instant = new AtomicReference<>(initial);
        }

        void advanceSeconds(long seconds) {
            instant.updateAndGet(current -> current.plusSeconds(seconds));
        }

        @Override
        public ZoneOffset getZone() {
            return zone;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return instant.get();
        }
    }
}
