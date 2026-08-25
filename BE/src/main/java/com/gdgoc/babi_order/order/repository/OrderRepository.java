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

    Optional<Order> findByTossOrderId(String tossOrderId);

    List<Order> findAllByOrderByCreatedAtDescIdDesc();

    /**
     * 당일 발급된 픽업번호의 최댓값 — 순환(1~99) 시퀀스 기준.
     * createdAt 최신 주문의 번호가 아니라 max(pickup_number)를 쓴다
     * (늦게 결제된 선생성 주문이 더 큰 번호를 가진 뒤, 신주문 할당이 되돌아가는 사고 방지).
     */
    @Query("""
            select coalesce(max(o.pickupNumber), 0) from Order o
            where o.createdAt >= :startInclusive
              and o.createdAt < :endExclusive
              and o.pickupNumber > 0
            """)
    int findMaxAssignedPickupNumber(
            @Param("startInclusive") LocalDateTime startInclusive,
            @Param("endExclusive") LocalDateTime endExclusive);

    /**
     * 당일 활성(PREPARING/READY) 주문이 사용 중인 픽업번호 — 동시 활성 중복 방지용.
     */
    @Query("""
            select distinct o.pickupNumber from Order o
            where o.status in :statuses
              and o.createdAt >= :startInclusive
              and o.createdAt < :endExclusive
              and o.pickupNumber > 0
            """)
    List<Integer> findActivePickupNumbers(
            @Param("statuses") Collection<OrderStatus> statuses,
            @Param("startInclusive") LocalDateTime startInclusive,
            @Param("endExclusive") LocalDateTime endExclusive);

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

    @Query("""
            select count(o) from Order o
            where o.status in :statuses
              and exists (
                select 1 from Payment p
                where p.order = o and p.status = :paymentStatus
              )
            """)
    long countByStatusInAndPaid(
            @Param("statuses") Collection<OrderStatus> statuses,
            @Param("paymentStatus") PaymentStatus paymentStatus);
}
