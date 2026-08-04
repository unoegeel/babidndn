package com.gdgoc.babi_order.order.repository;

import com.gdgoc.babi_order.order.entity.Order;
import com.gdgoc.babi_order.order.entity.OrderStatus;
import com.gdgoc.babi_order.payment.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findAllByOrderByCreatedAtDescIdDesc();

    @Query("select coalesce(max(o.pickupNumber), 0) from Order o")
    Integer findMaxPickupNumber();

    @Query("""
            select count(o) from Order o
            where o.status in :statuses
              and o.pickupNumber < :pickupNumber
              and exists (
                select 1 from Payment p
                where p.order = o and p.status = :paymentStatus
              )
            """)
    long countByStatusInAndPickupNumberLessThanAndPaid(
            @Param("statuses") Collection<OrderStatus> statuses,
            @Param("pickupNumber") Integer pickupNumber,
            @Param("paymentStatus") PaymentStatus paymentStatus);
}
