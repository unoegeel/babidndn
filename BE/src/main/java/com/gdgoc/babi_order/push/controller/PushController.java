package com.gdgoc.babi_order.push.controller;

import com.gdgoc.babi_order.order.security.OrderAccessGuard;
import com.gdgoc.babi_order.push.dto.request.PushLinkOrderRequest;
import com.gdgoc.babi_order.push.dto.request.PushSubscribeRequest;
import com.gdgoc.babi_order.push.dto.response.VapidPublicKeyResponse;
import com.gdgoc.babi_order.push.service.PushNotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/push")
@RequiredArgsConstructor
@Tag(name = "Push", description = "Web Push 구독 API")
public class PushController {

    private final PushNotificationService pushNotificationService;

    @GetMapping("/vapid-public-key")
    @Operation(summary = "VAPID 공개키 조회", description = "브라우저 PushManager.subscribe 에 사용할 공개키를 반환합니다.")
    public ResponseEntity<VapidPublicKeyResponse> getVapidPublicKey() {
        return ResponseEntity.ok(new VapidPublicKeyResponse(pushNotificationService.getPublicKey()));
    }

    @PostMapping("/subscriptions")
    @Operation(summary = "Push 구독 등록", description = "브라우저 PushSubscription 정보를 저장합니다.")
    public ResponseEntity<Void> subscribe(@Valid @RequestBody PushSubscribeRequest request) {
        pushNotificationService.upsertSubscription(
                request.getEndpoint(),
                request.getP256dh(),
                request.getAuth()
        );
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/subscriptions/link-order")
    @Operation(summary = "구독-주문 연결", description = "결제/주문 후 해당 주문의 준비완료 푸시를 받을 수 있도록 연결합니다. X-Order-Access-Token 필요.")
    public ResponseEntity<Void> linkOrder(
            @Valid @RequestBody PushLinkOrderRequest request,
            @RequestHeader(value = OrderAccessGuard.HEADER, required = false) String accessToken) {
        pushNotificationService.linkOrder(request.getEndpoint(), request.getOrderId(), accessToken);
        return ResponseEntity.noContent().build();
    }
}
