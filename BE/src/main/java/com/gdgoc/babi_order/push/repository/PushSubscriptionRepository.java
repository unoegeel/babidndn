package com.gdgoc.babi_order.push.repository;

import com.gdgoc.babi_order.push.entity.PushSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, Long> {

    Optional<PushSubscription> findByEndpoint(String endpoint);

    boolean existsByIdAndOrderIdsContains(Long id, Long orderId);

    @Query("""
            select distinct s from PushSubscription s
            left join s.orderIds oid
            where oid = :orderId or s.orderId = :orderId
            """)
    List<PushSubscription> findByOrderId(@Param("orderId") Long orderId);
}
