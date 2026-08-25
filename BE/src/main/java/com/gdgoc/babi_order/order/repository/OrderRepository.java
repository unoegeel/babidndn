package com.gdgoc.babi_order.order.repository;

import com.gdgoc.babi_order.order.entity.Order;
import com.gdgoc.babi_order.order.entity.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {

    Optional<Order> findByTossOrderId(String tossOrderId);

    /**
     * Admin 주문 보드용: 지정 KST business-day 대기열 진입 순(오래된 것부터).
     * unpaid(pickup 미할당)은 제외 — 결제가력/이력 API와 분리된 queue view.
     */
    @Query("""
            select o from Order o
            where o.pickupAssignedAt is not null
              and o.pickupAssignedAt >= :dayStartInclusive
              and o.pickupAssignedAt < :dayEndExclusive
            order by o.pickupAssignedAt asc, o.id asc
            """)
    List<Order> findAllForAdminQueueOnDay(
            @Param("dayStartInclusive") LocalDateTime dayStartInclusive,
            @Param("dayEndExclusive") LocalDateTime dayEndExclusive);

    /**
     * 결제 이력 등: 결제 있는 주문 전체 (정렬은 호출부 — queue FIFO와 분리).
     */
    List<Order> findAllByOrderByIdDesc();

    /**
     * 당일 발급된 픽업번호의 최댓값 — 순환(1~99) 시퀀스 기준.
     * business-day는 pickupAssignedAt (KST day bounds) 기준.
     */
    @Query("""
            select coalesce(max(o.pickupNumber), 0) from Order o
            where o.pickupAssignedAt >= :startInclusive
              and o.pickupAssignedAt < :endExclusive
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
              and o.pickupAssignedAt >= :startInclusive
              and o.pickupAssignedAt < :endExclusive
              and o.pickupNumber > 0
            """)
    List<Integer> findActivePickupNumbers(
            @Param("statuses") Collection<OrderStatus> statuses,
            @Param("startInclusive") LocalDateTime startInclusive,
            @Param("endExclusive") LocalDateTime endExclusive);

    /**
     * 같은 KST business-day 안에서 나보다 먼저 대기열에 진입한 활성 주문 수.
     * Payment 상태는 보지 않는다 — queue source of truth는 Order.status.
     */
    @Query("""
            select count(o) from Order o
            where o.status in :statuses
              and o.pickupAssignedAt is not null
              and o.pickupAssignedAt >= :dayStartInclusive
              and o.pickupAssignedAt < :dayEndExclusive
              and (
                    o.pickupAssignedAt < :queueEnteredAt
                 or (o.pickupAssignedAt = :queueEnteredAt and o.id < :orderId)
              )
            """)
    long countActiveAheadInQueue(
            @Param("statuses") Collection<OrderStatus> statuses,
            @Param("dayStartInclusive") LocalDateTime dayStartInclusive,
            @Param("dayEndExclusive") LocalDateTime dayEndExclusive,
            @Param("queueEnteredAt") LocalDateTime queueEnteredAt,
            @Param("orderId") Long orderId);

    @Query("""
            select count(o) from Order o
            where o.status in :statuses
              and o.pickupAssignedAt is not null
              and o.pickupAssignedAt >= :dayStartInclusive
              and o.pickupAssignedAt < :dayEndExclusive
            """)
    long countActiveInQueueOnDay(
            @Param("statuses") Collection<OrderStatus> statuses,
            @Param("dayStartInclusive") LocalDateTime dayStartInclusive,
            @Param("dayEndExclusive") LocalDateTime dayEndExclusive);
}
