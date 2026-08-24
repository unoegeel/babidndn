package com.gdgoc.babi_order.payment.reconciliation.repository;

import com.gdgoc.babi_order.payment.reconciliation.ReconciliationIssueStatus;
import com.gdgoc.babi_order.payment.reconciliation.entity.PaymentReconciliationIssue;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PaymentReconciliationIssueRepository extends JpaRepository<PaymentReconciliationIssue, Long> {

    Optional<PaymentReconciliationIssue> findByActiveKey(String activeKey);

    List<PaymentReconciliationIssue> findByStatus(ReconciliationIssueStatus status);

    List<PaymentReconciliationIssue> findByStatusAndLastDetectedAtGreaterThanEqualOrderByLastDetectedAtDesc(
            ReconciliationIssueStatus status,
            LocalDateTime fromInclusive
    );

    List<PaymentReconciliationIssue> findByLastDetectedAtGreaterThanEqualOrderByLastDetectedAtDesc(
            LocalDateTime fromInclusive
    );

    long countByStatus(ReconciliationIssueStatus status);
}
