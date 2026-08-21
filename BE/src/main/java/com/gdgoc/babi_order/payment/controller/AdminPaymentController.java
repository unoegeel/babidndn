package com.gdgoc.babi_order.payment.controller;

import com.gdgoc.babi_order.payment.reconciliation.PaymentReconciliationService;
import com.gdgoc.babi_order.payment.reconciliation.dto.PaymentReconciliationResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 관리자 결제·주문 정합성 점검 API.
 * SecurityConfig: /api/admin/** → ROLE_ADMIN.
 */
@RestController
@RequestMapping("/api/admin/payments")
@RequiredArgsConstructor
@Tag(name = "Admin Payment", description = "관리자 결제 정합성 API")
public class AdminPaymentController {

    private final PaymentReconciliationService paymentReconciliationService;

    @GetMapping("/reconciliation")
    @Operation(
            summary = "결제·주문 정합성 점검",
            description = "최근 기간의 Order↔Payment 이상 건을 조회합니다. 자동 수정은 하지 않습니다. period=1d|7d|30d (기본 7d)."
    )
    public ResponseEntity<PaymentReconciliationResponse> reconcile(
            @RequestParam(value = "period", defaultValue = "7d") String period
    ) {
        return ResponseEntity.ok(paymentReconciliationService.reconcile(period));
    }
}
