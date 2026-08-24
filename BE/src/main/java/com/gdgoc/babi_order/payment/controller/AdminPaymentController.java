package com.gdgoc.babi_order.payment.controller;

import com.gdgoc.babi_order.payment.reconciliation.PaymentReconciliationScanService;
import com.gdgoc.babi_order.payment.reconciliation.PaymentReconciliationService;
import com.gdgoc.babi_order.payment.reconciliation.PaymentTossVerifyService;
import com.gdgoc.babi_order.payment.reconciliation.dto.PaymentReconciliationResponse;
import com.gdgoc.babi_order.payment.reconciliation.dto.PaymentTossVerifyResponse;
import com.gdgoc.babi_order.payment.reconciliation.dto.PersistedReconciliationIssueResponse;
import com.gdgoc.babi_order.payment.reconciliation.dto.ReconciliationScanResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 관리자 결제·주문 정합성 API.
 * SecurityConfig: /api/admin/** → ROLE_ADMIN.
 */
@RestController
@RequestMapping("/api/admin/payments")
@RequiredArgsConstructor
@Tag(name = "Admin Payment", description = "관리자 결제 정합성 API")
public class AdminPaymentController {

    private final PaymentReconciliationService paymentReconciliationService;
    private final PaymentReconciliationScanService paymentReconciliationScanService;
    private final PaymentTossVerifyService paymentTossVerifyService;

    @GetMapping("/reconciliation")
    @Operation(
            summary = "결제·주문 정합성 스냅샷 조회",
            description = "최근 기간의 현재 이상 건만 조회합니다. DB에 issue를 쓰지 않습니다. period=1d|7d|30d (기본 7d)."
    )
    public ResponseEntity<PaymentReconciliationResponse> reconcile(
            @RequestParam(value = "period", defaultValue = "7d") String period
    ) {
        return ResponseEntity.ok(paymentReconciliationService.reconcile(period));
    }

    @PostMapping("/reconciliation/scan")
    @Operation(
            summary = "정합성 스캔 및 incident persist",
            description = "탐지 → OPEN 생성/재탐지 touch → 조건 재검증 후만 RESOLVED. 결제/주문은 변경하지 않습니다."
    )
    public ResponseEntity<ReconciliationScanResponse> scan(
            @RequestParam(value = "period", defaultValue = "7d") String period
    ) {
        return ResponseEntity.ok(paymentReconciliationScanService.scan(period));
    }

    @GetMapping("/reconciliation/issues")
    @Operation(summary = "저장된 정합성 issue 목록", description = "status=OPEN|RESOLVED|ALL (기본 OPEN), period=1d|7d|30d")
    public ResponseEntity<List<PersistedReconciliationIssueResponse>> listIssues(
            @RequestParam(value = "status", defaultValue = "OPEN") String status,
            @RequestParam(value = "period", defaultValue = "30d") String period
    ) {
        return ResponseEntity.ok(paymentReconciliationScanService.listIssues(status, period));
    }

    @GetMapping("/reconciliation/issues/{id}")
    @Operation(summary = "저장된 정합성 issue 단건")
    public ResponseEntity<PersistedReconciliationIssueResponse> getIssue(@PathVariable Long id) {
        return ResponseEntity.ok(paymentReconciliationScanService.getIssue(id));
    }

    @PostMapping("/{paymentId}/verify")
    @Operation(
            summary = "Toss 단건 상태 재확인",
            description = "Toss GET만 수행합니다. confirm/cancel/DB 상태 변경 없음. paymentKey는 응답에 포함하지 않습니다."
    )
    public ResponseEntity<PaymentTossVerifyResponse> verify(@PathVariable Long paymentId) {
        return ResponseEntity.ok(paymentTossVerifyService.verify(paymentId));
    }
}
