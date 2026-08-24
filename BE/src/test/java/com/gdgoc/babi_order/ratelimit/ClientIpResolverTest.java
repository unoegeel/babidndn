package com.gdgoc.babi_order.ratelimit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import java.net.InetAddress;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ClientIpResolverTest {

    private ClientIpResolver resolver;

    @BeforeEach
    void setUp() {
        RateLimitProperties properties = new RateLimitProperties();
        properties.setTrustedProxies(List.of("127.0.0.1", "::1", "10.0.0.0/8"));
        resolver = new ClientIpResolver(properties);
    }

    @Test
    void directUntrustedUsesRemoteAddrAndIgnoresSpoofedForwardedFor() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("203.0.113.10");
        request.addHeader("X-Forwarded-For", "198.51.100.1");
        request.addHeader("X-Real-IP", "198.51.100.2");

        assertThat(resolver.resolve(request)).isEqualTo("203.0.113.10");
    }

    @Test
    void trustedProxyUsesXRealIp() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");
        request.addHeader("X-Real-IP", "198.51.100.7");

        assertThat(resolver.resolve(request)).isEqualTo("198.51.100.7");
    }

    @Test
    void trustedProxyUsesLeftmostForwardedFor() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.5");
        request.addHeader("X-Forwarded-For", "198.51.100.9, 10.0.0.5");

        assertThat(resolver.resolve(request)).isEqualTo("198.51.100.9");
    }

    @Test
    void trustedProxyMalformedForwardedFallsBackToRemote() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");
        request.addHeader("X-Forwarded-For", "not-an-ip");

        assertThat(resolver.resolve(request)).isEqualTo("127.0.0.1");
    }

    @Test
    void ipv6LoopbackIsTrusted() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("0:0:0:0:0:0:0:1");
        request.addHeader("X-Real-IP", "2001:db8::1");

        assertThat(InetAddress.getByName(resolver.resolve(request)))
                .isEqualTo(InetAddress.getByName("2001:db8::1"));
    }
}
