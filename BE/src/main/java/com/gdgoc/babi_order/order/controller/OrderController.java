package com.gdgoc.babi_order.order.controller;

import com.gdgoc.babi_order.order.dto.request.OrderCreateRequest;
import com.gdgoc.babi_order.order.dto.request.OrderStatusUpdateRequest;
import com.gdgoc.babi_order.order.dto.response.OrderDetailResponse;
import com.gdgoc.babi_order.order.dto.response.OrderSummaryResponse;
import com.gdgoc.babi_order.order.service.OrderEventService;
import com.gdgoc.babi_order.order.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@Tag(name = "Order", description = "주문 API")
public class OrderController {

    private final OrderService orderService;
    private final OrderEventService orderEventService;

    @PostMapping
    @Operation(summary = "주문 생성", description = "결제 전 임시 주문을 생성합니다. 픽업번호는 결제 승인 후 발급됩니다.")
    public ResponseEntity<OrderDetailResponse> createOrder(
            @Valid @RequestBody OrderCreateRequest request) {
        OrderDetailResponse response = orderService.createOrder(request);
        return ResponseEntity.created(URI.create("/api/orders/" + response.getId())).body(response);
    }

    @DeleteMapping("/{id}/unpaid")
    @Operation(summary = "미결제 주문 삭제", description = "결제 실패·취소 시 임시 주문을 삭제합니다.")
    public ResponseEntity<Void> abandonUnpaidOrder(@PathVariable("id") Long id) {
        orderService.abandonUnpaidOrder(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    @Operation(summary = "전체 주문 조회", description = "결제 내역이 있는 주문을 최근순으로 조회합니다. 미결제 임시 주문은 제외됩니다.")
    public ResponseEntity<List<OrderSummaryResponse>> getOrders() {
        return ResponseEntity.ok(orderService.getOrders());
    }

    @GetMapping("/{id}")
    @Operation(summary = "주문 상세 조회", description = "주문 상품과 옵션 스냅샷을 함께 조회합니다.")
    public ResponseEntity<OrderDetailResponse> getOrder(@PathVariable("id") Long id) {
        return ResponseEntity.ok()
                .header("Cache-Control", "no-store")
                .body(orderService.getOrder(id));
    }

    @PatchMapping("/{id}/status")
    @PutMapping("/{id}/status")
    @Operation(summary = "주문 상태 변경", description = "관리자 조작으로 주문 상태를 변경하고 DB에 반영합니다.")
    public ResponseEntity<OrderDetailResponse> updateOrderStatus(
            @PathVariable("id") Long id,
            @Valid @RequestBody OrderStatusUpdateRequest request) {
        return ResponseEntity.ok(orderService.updateStatus(id, request.getStatus()));
    }

    @PostMapping("/{id}/call")
    @Operation(summary = "고객 호출", description = "주문을 READY(준비 완료)로 변경하거나, 이미 READY면 재호출(updatedAt 갱신)합니다.")
    public ResponseEntity<OrderDetailResponse> callOrder(@PathVariable("id") Long id) {
        return ResponseEntity.ok(orderService.callCustomer(id));
    }

    @PostMapping("/{id}/complete")
    @Operation(summary = "픽업 완료", description = "PREPARING/READY 주문을 COMPLETED로 변경합니다.")
    public ResponseEntity<OrderDetailResponse> completeOrder(@PathVariable("id") Long id) {
        return ResponseEntity.ok(orderService.completeOrder(id));
    }

    @GetMapping(value = "/stream", produces = "text/event-stream")
    @Operation(summary = "주문 실시간 알림 구독", description = "신규 주문과 주문 상태 변경 이벤트를 SSE로 전달합니다.")
    public ResponseEntity<SseEmitter> subscribeOrderEvents() {
        return ResponseEntity.ok()
                .header("Cache-Control", "no-cache")
                .header("X-Accel-Buffering", "no")
                .body(orderEventService.subscribe());
    }
}
