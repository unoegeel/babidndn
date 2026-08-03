package com.gdgoc.babi_order.payment.controller;

import com.gdgoc.babi_order.payment.dto.request.PaymentCancelRequest;
import com.gdgoc.babi_order.payment.dto.request.PaymentConfirmRequest;
import com.gdgoc.babi_order.payment.dto.request.PaymentWebhookRequest;
import com.gdgoc.babi_order.payment.dto.response.PaymentConfirmResponse;
import com.gdgoc.babi_order.payment.dto.response.PaymentFailResponse;
import com.gdgoc.babi_order.payment.dto.response.PaymentResponse;
import com.gdgoc.babi_order.payment.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Tag(name = "Payment", description = "결제 API")
public class PaymentController {

    private final PaymentService paymentService;

    @Operation(summary = "결제 성공 콜백", description = "토스 샌드박스/결제창의 successUrl로 자동 호출됩니다. 승인 후 DB에 저장합니다.")
    @GetMapping("/success")
    public ResponseEntity<PaymentConfirmResponse> success(
            @RequestParam("paymentKey") String paymentKey,
            @RequestParam("orderId") String orderId,
            @RequestParam("amount") Integer amount) {
        PaymentConfirmRequest request = PaymentConfirmRequest.builder()
                .paymentKey(paymentKey)
                .orderId(orderId)
                .amount(amount)
                .build();
        return ResponseEntity.ok(paymentService.confirm(request));
    }

    @Operation(summary = "결제 승인 (수동)", description = "paymentKey, orderId, amount를 직접 입력해서 승인합니다.")
    @PostMapping("/confirm")
    public ResponseEntity<PaymentConfirmResponse> confirm(@Valid @RequestBody PaymentConfirmRequest request) {
        return ResponseEntity.ok(paymentService.confirm(request));
    }

    @Operation(summary = "결제 실패 콜백", description = "토스 결제창에서 실패/취소 시 failUrl로 호출됩니다.")
    @GetMapping("/fail")
    public ResponseEntity<PaymentFailResponse> fail(
            @RequestParam("code") String code,
            @RequestParam("message") String message,
            @RequestParam(value = "orderId", required = false) String orderId) {
        return ResponseEntity.ok(paymentService.handleFailure(code, message, orderId));
    }

    @Operation(summary = "결제 취소", description = "승인된 결제를 취소합니다.")
    @PostMapping("/{paymentKey}/cancel")
    public ResponseEntity<PaymentResponse> cancel(
            @PathVariable("paymentKey") String paymentKey,
            @Valid @RequestBody PaymentCancelRequest request) {
        return ResponseEntity.ok(paymentService.cancel(paymentKey, request));
    }

    @Operation(summary = "결제 조회 (paymentKey)", description = "토스 결제 키로 결제 내역을 조회합니다.")
    @GetMapping("/{paymentKey}")
    public ResponseEntity<PaymentResponse> getByPaymentKey(@PathVariable("paymentKey") String paymentKey) {
        return ResponseEntity.ok(paymentService.getByPaymentKey(paymentKey));
    }

    @Operation(summary = "결제 조회 (orderId)", description = "주문 ID로 결제 내역을 조회합니다.")
    @GetMapping("/orders/{orderId}")
    public ResponseEntity<PaymentResponse> getByOrderId(@PathVariable("orderId") Long orderId) {
        return ResponseEntity.ok(paymentService.getByOrderId(orderId));
    }

    @Operation(summary = "결제 상태 변경 웹훅", description = "Toss가 결제 상태 변경 시 호출합니다. payload를 그대로 신뢰하지 않고 조회 API로 재검증 후 동기화합니다.")
    @PostMapping("/webhook")
    public ResponseEntity<Void> handleWebhook(@RequestBody PaymentWebhookRequest request) {
        paymentService.syncFromWebhook(request);
        return ResponseEntity.ok().build();
    }
}
