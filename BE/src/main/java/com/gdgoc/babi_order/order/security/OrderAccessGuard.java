package com.gdgoc.babi_order.order.security;

import com.gdgoc.babi_order.order.entity.Order;
import com.gdgoc.babi_order.order.exception.OrderApiException;
import com.gdgoc.babi_order.order.exception.OrderNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * 고객 주문 ownership 검증.
 * ROLE_ADMIN만 token 없이 허용. ROLE_DEVELOPER는 bypass하지 않는다.
 * missing/wrong/null-hash는 존재하지 않는 주문과 동일하게 404 처리한다.
 */
@Component
public class OrderAccessGuard {

    public static final String HEADER = "X-Order-Access-Token";

    public void requireCustomerOrderAccess(Order order, String rawAccessToken) {
        if (isAdmin()) {
            return;
        }
        if (order == null) {
            throw new OrderNotFoundException(null);
        }
        String hash = order.getAccessTokenHash();
        if (hash == null || hash.isBlank()
                || !OrderAccessTokens.matches(rawAccessToken, hash)) {
            throw new OrderNotFoundException(order.getId());
        }
    }

    /** 결제 취소 등 Admin 전용 mutation */
    public void requireAdmin() {
        if (!isAdmin()) {
            throw new OrderApiException(
                    HttpStatus.FORBIDDEN,
                    "FORBIDDEN",
                    "관리자 권한이 필요합니다."
            );
        }
    }

    public boolean isAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            if ("ROLE_ADMIN".equals(authority.getAuthority())) {
                return true;
            }
        }
        return false;
    }
}
