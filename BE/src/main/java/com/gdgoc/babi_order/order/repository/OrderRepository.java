package com.gdgoc.babi_order.order.repository;

import com.gdgoc.babi_order.order.entity.Order;
import com.gdgoc.babi_order.order.entity.OrderStatus;
import com.gdgoc.babi_order.payment.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findAllByOrderByCreatedAtDescIdDesc();

    /**
     * 당일(구간) 픽업번호가 발급된 가장 최근 주문 — 픽업번호 순환(1~99) 발급용.
     * 미결제(픽업번호 0) 주문은 제외합니다.
     */
    Optional<Order> findFirstByCreatedAtGreaterThanEqualAndCreatedAtLessThanAndPickupNumberGreaterThanOrderByCreatedAtDescIdDesc(
            LocalDateTime startInclusive,
            LocalDateTime endExclusive,
            Integer pickupNumberExclusive);

    @Query("""
            select count(o) from Order o
            where o.status in :statuses
              and o.id < :orderId
              and exists (
                select 1 from Payment p
                where p.order = o and p.status = :paymentStatus
              )
            """)
    long countByStatusInAndIdLessThanAndPaid(
            @Param("statuses") Collection<OrderStatus> statuses,
            @Param("orderId") Long orderId,
            @Param("paymentStatus") PaymentStatus paymentStatus);
}
