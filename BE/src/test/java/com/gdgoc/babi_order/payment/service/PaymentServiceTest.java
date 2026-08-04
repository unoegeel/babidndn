package com.gdgoc.babi_order.payment.service;

import com.gdgoc.babi_order.order.entity.Order;
import com.gdgoc.babi_order.order.repository.OrderRepository;
import com.gdgoc.babi_order.order.service.OrderService;
import com.gdgoc.babi_order.payment.client.TossPaymentClient;
import com.gdgoc.babi_order.payment.dto.request.PaymentCancelRequest;
import com.gdgoc.babi_order.payment.dto.request.PaymentConfirmRequest;
import com.gdgoc.babi_order.payment.dto.request.PaymentWebhookRequest;
import com.gdgoc.babi_order.payment.dto.response.PaymentConfirmResponse;
import com.gdgoc.babi_order.payment.dto.response.PaymentResponse;
import com.gdgoc.babi_order.payment.entity.Payment;
import com.gdgoc.babi_order.payment.entity.PaymentStatus;
import com.gdgoc.babi_order.payment.exception.PaymentAlreadyCanceledException;
import com.gdgoc.babi_order.payment.exception.PaymentAlreadyProcessedException;
import com.gdgoc.babi_order.payment.exception.PaymentAmountMismatchException;
import com.gdgoc.babi_order.payment.exception.PaymentNotFoundException;
import com.gdgoc.babi_order.payment.exception.PaymentOrderNotFoundException;
import com.gdgoc.babi_order.payment.repository.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private TossPaymentClient tossPaymentClient;

    @Mock
    private OrderService orderService;

    private PaymentService paymentService;

    @BeforeEach
    void setUp() {
        paymentService = new PaymentService(
                paymentRepository, orderRepository, tossPaymentClient, orderService);
    }

    @Test
    void confirmSucceedsWhenAmountMatchesOrder() {
        Order order = order(1L, 18000);
        given(orderRepository.findById(1L)).willReturn(Optional.of(order));
        given(paymentRepository.findByOrder_Id(1L)).willReturn(Optional.empty());
        given(tossPaymentClient.confirm("payKey", "1", 18000))
                .willReturn(tossResponse("payKey", "1", 18000, "DONE"));
        given(paymentRepository.save(any())).willAnswer(invocation -> {
            Payment saved = invocation.getArgument(0);
            ReflectionTestUtils.setField(saved, "id", 10L);
            return saved;
        });

        PaymentConfirmResponse response = paymentService.confirm(confirmRequest("payKey", "1", 18000));

        assertThat(response.getOrderId()).isEqualTo(1L);
        assertThat(response.getTossOrderId()).isEqualTo("1");
        assertThat(response.getStatus()).isEqualTo("DONE");
        verify(tossPaymentClient, never()).cancel(anyString(), anyString());
        verify(orderService).activateAfterPayment(1L);
    }

    @Test
    void confirmThrowsWhenOrderDoesNotExist() {
        given(orderRepository.findById(999L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> paymentService.confirm(confirmRequest("payKey", "999", 18000)))
                .isInstanceOf(PaymentOrderNotFoundException.class);
    }

    @Test
    void confirmThrowsWhenTossOrderIdIsNotAnOrderId() {
        assertThatThrownBy(() -> paymentService.confirm(confirmRequest("payKey", "not-a-number", 18000)))
                .isInstanceOf(PaymentOrderNotFoundException.class);
    }

    @Test
    void confirmThrowsWhenOrderAlreadyPaid() {
        Order order = order(1L, 18000);
        given(orderRepository.findById(1L)).willReturn(Optional.of(order));
        given(paymentRepository.findByOrder_Id(1L))
                .willReturn(Optional.of(payment(order, "oldKey", PaymentStatus.DONE)));

        assertThatThrownBy(() -> paymentService.confirm(confirmRequest("payKey", "1", 18000)))
                .isInstanceOf(PaymentAlreadyProcessedException.class);
        verify(tossPaymentClient, never()).confirm(anyString(), anyString(), any());
    }

    @Test
    void confirmThrowsWhenRequestedAmountDiffersFromOrder() {
        Order order = order(1L, 18000);
        given(orderRepository.findById(1L)).willReturn(Optional.of(order));
        given(paymentRepository.findByOrder_Id(1L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> paymentService.confirm(confirmRequest("payKey", "1", 100)))
                .isInstanceOf(PaymentAmountMismatchException.class);
        verify(tossPaymentClient, never()).confirm(anyString(), anyString(), any());
    }

    @Test
    void confirmAutoCancelsWhenTossAmountDiffersFromOrderAfterApproval() {
        Order order = order(1L, 18000);
        given(orderRepository.findById(1L)).willReturn(Optional.of(order));
        given(paymentRepository.findByOrder_Id(1L)).willReturn(Optional.empty());
        given(tossPaymentClient.confirm("payKey", "1", 18000))
                .willReturn(tossResponse("payKey", "1", 999, "DONE"));

        assertThatThrownBy(() -> paymentService.confirm(confirmRequest("payKey", "1", 18000)))
                .isInstanceOf(PaymentAmountMismatchException.class);
        verify(tossPaymentClient).cancel("payKey", "결제 금액과 주문 금액 불일치로 인한 자동 취소");
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void cancelSucceedsWhenPaymentIsDone() {
        Order order = order(1L, 18000);
        Payment payment = payment(order, "payKey", PaymentStatus.DONE);
        given(paymentRepository.findByPaymentKey("payKey")).willReturn(Optional.of(payment));

        PaymentResponse response = paymentService.cancel("payKey", cancelRequest("고객 요청"));

        assertThat(response.getStatus()).isEqualTo("CANCELED");
        verify(tossPaymentClient).cancel("payKey", "고객 요청");
        verify(orderService).cancelOrderDueToPaymentCancel(1L);
    }

    @Test
    void cancelThrowsWhenAlreadyCanceled() {
        Order order = order(1L, 18000);
        Payment payment = payment(order, "payKey", PaymentStatus.CANCELED);
        given(paymentRepository.findByPaymentKey("payKey")).willReturn(Optional.of(payment));

        assertThatThrownBy(() -> paymentService.cancel("payKey", cancelRequest("중복 취소")))
                .isInstanceOf(PaymentAlreadyCanceledException.class);
        verify(tossPaymentClient, never()).cancel(anyString(), anyString());
    }

    @Test
    void cancelThrowsWhenPaymentNotFound() {
        given(paymentRepository.findByPaymentKey("missing")).willReturn(Optional.empty());

        assertThatThrownBy(() -> paymentService.cancel("missing", cancelRequest("사유")))
                .isInstanceOf(PaymentNotFoundException.class);
    }

    @Test
    void syncFromWebhookUpdatesStatusUsingTossLookupResultNotPayload() {
        Order order = order(1L, 18000);
        Payment payment = payment(order, "payKey", PaymentStatus.DONE);
        given(paymentRepository.findByPaymentKey("payKey")).willReturn(Optional.of(payment));
        given(tossPaymentClient.getPayment("payKey"))
                .willReturn(tossResponse("payKey", "1", 18000, "CANCELED"));

        paymentService.syncFromWebhook(webhookRequest("payKey", "DONE"));

        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.CANCELED);
    }

    @Test
    void syncFromWebhookIgnoresUnregisteredPaymentWithoutCallingToss() {
        given(paymentRepository.findByPaymentKey("unknown")).willReturn(Optional.empty());

        paymentService.syncFromWebhook(webhookRequest("unknown", "DONE"));

        verify(tossPaymentClient, never()).getPayment(anyString());
    }

    @Test
    void syncFromWebhookIgnoresPayloadWithoutPaymentKey() {
        PaymentWebhookRequest request = webhookRequest(null, "DONE");

        paymentService.syncFromWebhook(request);

        verify(paymentRepository, never()).findByPaymentKey(anyString());
        verify(tossPaymentClient, never()).getPayment(anyString());
    }

    private PaymentConfirmRequest confirmRequest(String paymentKey, String orderId, Integer amount) {
        return PaymentConfirmRequest.builder()
                .paymentKey(paymentKey)
                .orderId(orderId)
                .amount(amount)
                .build();
    }

    private PaymentCancelRequest cancelRequest(String cancelReason) {
        PaymentCancelRequest request = new PaymentCancelRequest();
        ReflectionTestUtils.setField(request, "cancelReason", cancelReason);
        return request;
    }

    private PaymentWebhookRequest webhookRequest(String paymentKey, String status) {
        PaymentWebhookRequest request = new PaymentWebhookRequest();
        ReflectionTestUtils.setField(request, "eventType", "PAYMENT_STATUS_CHANGED");
        if (paymentKey != null) {
            PaymentWebhookRequest.Data data = new PaymentWebhookRequest.Data();
            ReflectionTestUtils.setField(data, "paymentKey", paymentKey);
            ReflectionTestUtils.setField(data, "orderId", "1");
            ReflectionTestUtils.setField(data, "status", status);
            ReflectionTestUtils.setField(request, "data", data);
        }
        return request;
    }

    private Order order(Long id, Integer totalAmount) {
        Order order = new Order(1);
        ReflectionTestUtils.setField(order, "id", id);
        ReflectionTestUtils.setField(order, "totalAmount", totalAmount);
        return order;
    }

    private Payment payment(Order order, String paymentKey, PaymentStatus status) {
        Payment payment = Payment.builder()
                .order(order)
                .tossOrderId(order.getId().toString())
                .paymentKey(paymentKey)
                .amount(order.getTotalAmount())
                .status(status)
                .approvedAt(LocalDateTime.now())
                .build();
        ReflectionTestUtils.setField(payment, "id", 100L);
        return payment;
    }

    private TossPaymentClient.TossPaymentResponse tossResponse(
            String paymentKey, String orderId, Integer totalAmount, String status) {
        TossPaymentClient.TossPaymentResponse response = new TossPaymentClient.TossPaymentResponse();
        ReflectionTestUtils.setField(response, "paymentKey", paymentKey);
        ReflectionTestUtils.setField(response, "orderId", orderId);
        ReflectionTestUtils.setField(response, "status", status);
        ReflectionTestUtils.setField(response, "approvedAt", OffsetDateTime.now().toString());
        ReflectionTestUtils.setField(response, "totalAmount", totalAmount);
        return response;
    }
}
