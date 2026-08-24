package com.gdgoc.babi_order.ratelimit;

import com.gdgoc.babi_order.admin.security.AdminAuthenticationEntryPoint;
import com.gdgoc.babi_order.admin.security.JwtAuthenticationFilter;
import com.gdgoc.babi_order.config.CorsProperties;
import com.gdgoc.babi_order.config.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class RateLimitCorsExposeTest {

    @Test
    @SuppressWarnings("unchecked")
    void exposesRetryAfterAlongsideExistingHeaders() {
        CorsProperties corsProperties = new CorsProperties();
        corsProperties.setAllowedOrigins(List.of("http://localhost:5173"));

        ObjectProvider<JwtAuthenticationFilter> jwtProvider = mock(ObjectProvider.class);
        ObjectProvider<AdminAuthenticationEntryPoint> entryPointProvider = mock(ObjectProvider.class);
        when(jwtProvider.getIfAvailable()).thenReturn(null);
        when(entryPointProvider.getIfAvailable()).thenReturn(null);

        SecurityConfig securityConfig = new SecurityConfig(corsProperties, jwtProvider, entryPointProvider);
        CorsConfigurationSource source = securityConfig.corsConfigurationSource();
        CorsConfiguration config = source.getCorsConfiguration(
                new MockHttpServletRequest("GET", "/api/admin/auth/login")
        );

        assertThat(config).isNotNull();
        assertThat(config.getExposedHeaders())
                .contains("Location", "X-Request-Id", HttpHeaders.RETRY_AFTER);
    }
}
