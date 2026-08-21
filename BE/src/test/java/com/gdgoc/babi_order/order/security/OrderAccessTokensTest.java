package com.gdgoc.babi_order.order.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class OrderAccessTokensTest {

    @Test
    void generateRawIsUrlSafeAndNonEmpty() {
        String raw = OrderAccessTokens.generateRaw();
        assertThat(raw).isNotBlank();
        assertThat(raw).doesNotContain("=");
        assertThat(raw).doesNotContain("+");
        assertThat(raw).doesNotContain("/");
    }

    @Test
    void sha256HexIs64CharsAndMatches() {
        String raw = OrderAccessTokens.generateRaw();
        String hash = OrderAccessTokens.sha256Hex(raw);
        assertThat(hash).hasSize(64);
        assertThat(OrderAccessTokens.matches(raw, hash)).isTrue();
        assertThat(OrderAccessTokens.matches(raw + "x", hash)).isFalse();
        assertThat(hash).isNotEqualTo(raw);
    }
}
