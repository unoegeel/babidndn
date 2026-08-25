package com.gdgoc.babi_order.payment.repository;

import com.gdgoc.babi_order.payment.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByPaymentKey(String paymentKey);
    Optional<Payment> findByOrder_Id(Long orderId);
    List<Payment> findByOrder_IdIn(List<Long> orderIds);

    /**
     * Admin 결제 내역 — business-day / queue FIFO와 무관.
     * Canonical sort: approvedAt DESC, id DESC.
     */
    @Query("""
            select p from Payment p
            join fetch p.order
            order by p.approvedAt desc, p.id desc
            """)
    List<Payment> findAllForAdminHistory();
}
