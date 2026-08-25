package com.gdgoc.babi_order.admin.controller;

import com.gdgoc.babi_order.payment.dto.response.AdminPaymentHistoryItemResponse;
import com.gdgoc.babi_order.payment.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/payments")
@RequiredArgsConstructor
@Tag(name = "Admin Payment", description = "관리자 결제 내역 API")
public class AdminPaymentController {

    private final PaymentService paymentService;

    @GetMapping
    @Operation(
            summary = "결제 내역 전체 조회",
            description = "business-day 제한 없음. approvedAt DESC (최신 결제 먼저). Admin 주문 대기열(FIFO)과 독립.")
    public ResponseEntity<List<AdminPaymentHistoryItemResponse>> listHistory() {
        return ResponseEntity.ok()
                .header("Cache-Control", "no-store")
                .body(paymentService.listAdminHistory());
    }
}
