package com.gdgoc.babi_order.common.request;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RequestIdSupportTest {

    @Test
    void generatesUuidWhenHeaderMissing() {
        String requestId = RequestIdSupport.resolve(null);
        assertThat(requestId).matches("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$");
    }

    @Test
    void acceptsValidExternalRequestId() {
        assertThat(RequestIdSupport.resolve("test-request-id")).isEqualTo("test-request-id");
    }

    @Test
    void rejectsInvalidRequestIdAndGeneratesNewOne() {
        String requestId = RequestIdSupport.resolve("bad\nid");
        assertThat(requestId).isNotEqualTo("bad\nid");
        assertThat(requestId).matches("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$");
    }

    @Test
    void rejectsOverlongRequestId() {
        String overlong = "a".repeat(65);
        String requestId = RequestIdSupport.resolve(overlong);
        assertThat(requestId).hasSize(36);
    }
}
