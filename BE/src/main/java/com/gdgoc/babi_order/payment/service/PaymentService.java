package com.gdgoc.babi_order.payment.service;

import com.gdgoc.babi_order.order.entity.Order;
import com.gdgoc.babi_order.order.repository.OrderRepository;
import com.gdgoc.babi_order.order.service.OrderService;
import com.gdgoc.babi_order.payment.client.TossPaymentClient;
import com.gdgoc.babi_order.payment.entity.Payment;
import com.gdgoc.babi_order.payment.entity.PaymentStatus;
import com.gdgoc.babi_order.payment.dto.request.PaymentCancelRequest;
import com.gdgoc.babi_order.payment.dto.request.PaymentConfirmRequest;
import com.gdgoc.babi_order.payment.dto.request.PaymentWebhookRequest;
import com.gdgoc.babi_order.payment.dto.response.PaymentConfirmResponse;
import com.gdgoc.babi_order.payment.dto.response.PaymentFailResponse;
import com.gdgoc.babi_order.payment.dto.response.PaymentResponse;
import com.gdgoc.babi_order.payment.exception.PaymentAlreadyCanceledException;
import com.gdgoc.babi_order.payment.exception.PaymentAlreadyProcessedException;
import com.gdgoc.babi_order.payment.exception.PaymentAmountMismatchException;
import com.gdgoc.babi_order.payment.exception.PaymentNotFoundException;
import com.gdgoc.babi_order.payment.exception.PaymentOrderNotFoundException;
import com.gdgoc.babi_order.payment.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final TossPaymentClient tossPaymentClient;
    private final OrderService orderService;

    @Transactional
    public PaymentConfirmResponse confirm(PaymentConfirmRequest request) {
        Order order = resolveOrder(request);
        validateNotAlreadyPaid(order.getId());
        validateAmount(order.getTotalAmount(), request.getAmount());

        TossPaymentClient.TossPaymentResponse tossResponse = tossPaymentClient.confirm(
                request.getPaymentKey(),
                request.getOrderId(),
                request.getAmount()
        );

        // Toss 승인 응답 금액도 주문 금액과 다시 대조한다.
        // 일치하지 않으면 이미 결제가 이루어진 상태이므로 즉시 취소해 자금이 묶이지 않게 한다.
        if (!order.getTotalAmount().equals(tossResponse.getTotalAmount())) {
            log.warn("결제 금액 불일치로 자동 취소합니다. orderId={}, orderAmount={}, tossAmount={}",
                    request.getOrderId(), order.getTotalAmount(), tossResponse.getTotalAmount());
            tossPaymentClient.cancel(tossResponse.getPaymentKey(), "결제 금액과 주문 금액 불일치로 인한 자동 취소");
            throw new PaymentAmountMismatchException(order.getTotalAmount(), tossResponse.getTotalAmount());
        }

        LocalDateTime approvedAt = OffsetDateTime.parse(tossResponse.getApprovedAt())
                .atZoneSameInstant(ZoneId.of("Asia/Seoul"))
                .toLocalDateTime();
        Payment payment = Payment.builder()
                .order(order)
                .tossOrderId(request.getOrderId())
                .paymentKey(request.getPaymentKey())
                .amount(request.getAmount())
                .status(PaymentStatus.DONE)
                .approvedAt(approvedAt)
                .build();

        Payment saved = paymentRepository.save(payment);
        // 결제 확정 후에만 픽업번호 발급 + 주문 보드/내역 노출
        orderService.activateAfterPayment(order.getId());

        return PaymentConfirmResponse.builder()
                .id(saved.getId())
                .paymentKey(saved.getPaymentKey())
                .orderId(saved.getOrder().getId())
                .tossOrderId(saved.getTossOrderId())
                .amount(saved.getAmount())
                .status(saved.getStatus().name())
                .approvedAt(saved.getApprovedAt())
                .build();
    }

    private Order resolveOrder(PaymentConfirmRequest request) {
        if (request.getInternalOrderId() != null) {
            Order order = orderRepository.findById(request.getInternalOrderId())
                    .orElseThrow(() -> new PaymentOrderNotFoundException(request.getOrderId()));
            validateTossOrderIdMatches(order, request.getOrderId());
            return order;
        }
        return findOrderByTossOrderId(request.getOrderId());
    }

    private void validateTossOrderIdMatches(Order order, String tossOrderId) {
        if (order.getTossOrderId() != null && order.getTossOrderId().equals(tossOrderId)) {
            return;
        }
        String idPart = tossOrderId.contains("-")
                ? tossOrderId.substring(0, tossOrderId.indexOf('-'))
                : tossOrderId;
        try {
            long parsed = Long.parseLong(idPart);
            if (!order.getId().equals(parsed)) {
                throw new PaymentOrderNotFoundException(tossOrderId);
            }
        } catch (NumberFormatException e) {
            throw new PaymentOrderNotFoundException(tossOrderId);
        }
    }

    private Order findOrderByTossOrderId(String tossOrderId) {
        return orderRepository.findByTossOrderId(tossOrderId)
                .orElseGet(() -> findOrderByTossOrderIdPrefix(tossOrderId));
    }

    private Order findOrderByTossOrderIdPrefix(String tossOrderId) {
        // tossOrderId는 "000007-a1b2c3d4"처럼 주문 PK를 0-패딩한 값 뒤에
        // 랜덤 접미사를 붙인 형태이므로, 하이픈 앞부분만 파싱해 주문을 찾는다.
        String idPart = tossOrderId.contains("-")
                ? tossOrderId.substring(0, tossOrderId.indexOf('-'))
                : tossOrderId;
        Long orderId;
        try {
            orderId = Long.parseLong(idPart);
        } catch (NumberFormatException e) {
            throw new PaymentOrderNotFoundException(tossOrderId);
        }
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new PaymentOrderNotFoundException(tossOrderId));
    }

    private void validateNotAlreadyPaid(Long orderId) {
        paymentRepository.findByOrder_Id(orderId)
                .filter(payment -> payment.getStatus() == PaymentStatus.DONE)
                .ifPresent(payment -> {
                    throw new PaymentAlreadyProcessedException(orderId);
                });
    }

    private void validateAmount(Integer expectedAmount, Integer requestedAmount) {
        if (!expectedAmount.equals(requestedAmount)) {
            throw new PaymentAmountMismatchException(expectedAmount, requestedAmount);
        }
    }

    @Transactional
    public void syncFromWebhook(PaymentWebhookRequest request) {
        String paymentKey = request.getData() != null ? request.getData().getPaymentKey() : null;
        if (paymentKey == null || paymentKey.isBlank()) {
            log.warn("웹훅 payload에 paymentKey가 없어 무시합니다. eventType={}", request.getEventType());
            return;
        }

        Payment payment = paymentRepository.findByPaymentKey(paymentKey).orElse(null);
        if (payment == null) {
            log.info("웹훅으로 수신된 결제가 아직 등록되어 있지 않아 무시합니다. paymentKey={}", paymentKey);
            return;
        }

        // 웹훅 payload는 위변조될 수 있으므로 그대로 신뢰하지 않고,
        // Toss 결제 조회 API로 실제 상태를 다시 확인한 뒤에만 반영한다.
        TossPaymentClient.TossPaymentResponse actual = tossPaymentClient.getPayment(paymentKey);
        PaymentStatus actualStatus = mapTossStatus(actual.getStatus());
        if (actualStatus == null) {
            log.warn("알 수 없는 결제 상태를 수신했습니다. paymentKey={}, status={}", paymentKey, actual.getStatus());
            return;
        }

        if (payment.getStatus() != actualStatus) {
            PaymentStatus previousStatus = payment.getStatus();
            payment.syncStatus(actualStatus);
            log.info("웹훅으로 결제 상태를 동기화했습니다. paymentKey={}, {} -> {}",
                    paymentKey, previousStatus, actualStatus);
        }
    }

    private PaymentStatus mapTossStatus(String tossStatus) {
        return switch (tossStatus) {
            case "DONE" -> PaymentStatus.DONE;
            case "CANCELED" -> PaymentStatus.CANCELED;
            case "PARTIAL_CANCELED" -> PaymentStatus.PARTIAL_CANCELED;
            default -> null;
        };
    }

    @Transactional
    public PaymentResponse cancel(String paymentKey, PaymentCancelRequest request) {
        Payment payment = paymentRepository.findByPaymentKey(paymentKey)
                .orElseThrow(() -> PaymentNotFoundException.byPaymentKey(paymentKey));

        if (payment.getStatus() == PaymentStatus.CANCELED) {
            throw new PaymentAlreadyCanceledException(paymentKey);
        }

        tossPaymentClient.cancel(paymentKey, request.getCancelReason());
        payment.cancel(request.getCancelReason());

        // 준비 완료 전·후 환불 시 주문도 취소해 고객 실시간 현황에 반영
        orderService.cancelOrderDueToPaymentCancel(payment.getOrder().getId());

        return toPaymentResponse(payment);
    }

    public PaymentResponse getByPaymentKey(String paymentKey) {
        Payment payment = paymentRepository.findByPaymentKey(paymentKey)
                .orElseThrow(() -> PaymentNotFoundException.byPaymentKey(paymentKey));
        return toPaymentResponse(payment);
    }

    public PaymentResponse getByOrderId(Long orderId) {
        Payment payment = paymentRepository.findByOrder_Id(orderId)
                .orElseThrow(() -> PaymentNotFoundException.byOrderId(orderId));
        return toPaymentResponse(payment);
    }

    public PaymentFailResponse handleFailure(String code, String message, String orderId) {
        log.warn("결제 실패 콜백 수신. orderId={}, code={}, message={}", orderId, code, message);
        return PaymentFailResponse.builder()
                .code(code)
                .message(message)
                .orderId(orderId)
                .build();
    }

    private PaymentResponse toPaymentResponse(Payment payment) {
        return PaymentResponse.builder()
                .id(payment.getId())
                .paymentKey(payment.getPaymentKey())
                .orderId(payment.getOrder().getId())
                .tossOrderId(payment.getTossOrderId())
                .amount(payment.getAmount())
                .status(payment.getStatus().name())
                .cancelReason(payment.getCancelReason())
                .approvedAt(payment.getApprovedAt())
                .createdAt(payment.getCreatedAt())
                .build();
    }
}
