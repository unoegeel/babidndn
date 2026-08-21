package com.gdgoc.babi_order.order.security;

import com.gdgoc.babi_order.order.entity.Order;
import com.gdgoc.babi_order.order.exception.OrderApiException;
import com.gdgoc.babi_order.order.exception.OrderNotFoundException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OrderAccessGuardTest {

    private final OrderAccessGuard guard = new OrderAccessGuard();

    @AfterEach
    void clearSecurity() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void allowsAdminWithoutToken() {
        setRole("ROLE_ADMIN");
        Order order = orderWithHash(OrderAccessTokens.sha256Hex("secret"));

        assertThatCode(() -> guard.requireCustomerOrderAccess(order, null))
                .doesNotThrowAnyException();
    }

    @Test
    void deniesDeveloperWithoutMatchingToken() {
        setRole("ROLE_DEVELOPER");
        Order order = orderWithHash(OrderAccessTokens.sha256Hex("secret"));

        assertThatThrownBy(() -> guard.requireCustomerOrderAccess(order, null))
                .isInstanceOf(OrderNotFoundException.class);
    }

    @Test
    void deniesMissingToken() {
        Order order = orderWithHash(OrderAccessTokens.sha256Hex("secret"));

        assertThatThrownBy(() -> guard.requireCustomerOrderAccess(order, null))
                .isInstanceOf(OrderNotFoundException.class);
    }

    @Test
    void deniesWrongToken() {
        Order order = orderWithHash(OrderAccessTokens.sha256Hex("secret"));

        assertThatThrownBy(() -> guard.requireCustomerOrderAccess(order, "other"))
                .isInstanceOf(OrderNotFoundException.class);
    }

    @Test
    void deniesLegacyNullHashEvenWithToken() {
        Order order = orderWithHash(null);

        assertThatThrownBy(() -> guard.requireCustomerOrderAccess(order, "any"))
                .isInstanceOf(OrderNotFoundException.class);
    }

    @Test
    void allowsMatchingToken() {
        String raw = OrderAccessTokens.generateRaw();
        Order order = orderWithHash(OrderAccessTokens.sha256Hex(raw));

        assertThatCode(() -> guard.requireCustomerOrderAccess(order, raw))
                .doesNotThrowAnyException();
    }

    @Test
    void requireAdminDeniesAnonymous() {
        assertThatThrownBy(guard::requireAdmin)
                .isInstanceOf(OrderApiException.class)
                .extracting("code")
                .isEqualTo("FORBIDDEN");
    }

    @Test
    void requireAdminAllowsAdmin() {
        setRole("ROLE_ADMIN");
        assertThatCode(guard::requireAdmin).doesNotThrowAnyException();
    }

    @Test
    void requireAdminDeniesDeveloper() {
        setRole("ROLE_DEVELOPER");
        assertThatThrownBy(guard::requireAdmin)
                .isInstanceOf(OrderApiException.class);
    }

    private void setRole(String role) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        "user",
                        null,
                        List.of(new SimpleGrantedAuthority(role))
                )
        );
    }

    private Order orderWithHash(String hash) {
        Order order = new Order(1);
        ReflectionTestUtils.setField(order, "id", 1L);
        if (hash != null) {
            order.assignAccessTokenHash(hash);
        }
        return order;
    }
}
