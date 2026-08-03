package com.gdgoc.babi_order.payment.repository;

import com.gdgoc.babi_order.payment.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByPaymentKey(String paymentKey);
    Optional<Payment> findByOrder_Id(Long orderId);
    List<Payment> findByOrder_IdIn(List<Long> orderIds);
}
