package com.gdgoc.babi_order.admin.security;

import com.gdgoc.babi_order.admin.config.JwtProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;

class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;

    @BeforeEach
    void setUp() {
        JwtProperties properties = new JwtProperties();
        properties.setSecret("test-jwt-secret-key-at-least-32-bytes-long");
        properties.setExpirationSeconds(3600);
        jwtTokenProvider = new JwtTokenProvider(properties, new ObjectMapper());
    }

    @Test
    void createdTokenContainsAdminLoginId() {
        String token = jwtTokenProvider.createToken("owner");

        assertThat(jwtTokenProvider.getValidLoginId(token)).contains("owner");
    }

    @Test
    void modifiedTokenIsRejected() {
        String token = jwtTokenProvider.createToken("owner");
        String modified = token.substring(0, token.length() - 1)
                + (token.endsWith("a") ? "b" : "a");

        assertThat(jwtTokenProvider.getValidLoginId(modified)).isEmpty();
    }

    @Test
    void malformedTokenIsRejected() {
        assertThat(jwtTokenProvider.getValidLoginId("not-a-jwt")).isEmpty();
    }
}
