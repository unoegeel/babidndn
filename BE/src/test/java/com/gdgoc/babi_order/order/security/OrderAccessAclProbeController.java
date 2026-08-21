package com.gdgoc.babi_order.order.security;

import com.gdgoc.babi_order.order.entity.Order;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * ACL 런타임 검증용 probe.
 * JwtAuthenticationFilter → SecurityContext → OrderAccessGuard 연결만 확인한다.
 */
@RestController
@RequestMapping("/__acl-probe")
public class OrderAccessAclProbeController {

    private final OrderAccessGuard orderAccessGuard;

    public OrderAccessAclProbeController(OrderAccessGuard orderAccessGuard) {
        this.orderAccessGuard = orderAccessGuard;
    }

    @GetMapping("/orders/{id}")
    public ResponseEntity<Void> requireAccess(
            @PathVariable("id") Long id,
            @RequestHeader(value = OrderAccessGuard.HEADER, required = false) String accessToken,
            @RequestParam(value = "hash", required = false) String hash
    ) {
        Order order = new Order(Order.UNASSIGNED_PICKUP_NUMBER);
        ReflectionTestUtils.setField(order, "id", id);
        if (hash != null && !hash.isBlank()) {
            order.assignAccessTokenHash(hash);
        }
        orderAccessGuard.requireCustomerOrderAccess(order, accessToken);
        return ResponseEntity.noContent().build();
    }
}
