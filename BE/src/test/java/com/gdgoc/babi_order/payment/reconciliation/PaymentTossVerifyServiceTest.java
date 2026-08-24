package com.gdgoc.babi_order.payment.reconciliation;

import com.gdgoc.babi_order.common.exception.ApiException;
import com.gdgoc.babi_order.order.entity.Order;
import com.gdgoc.babi_order.payment.client.TossPaymentClient;
import com.gdgoc.babi_order.payment.entity.Payment;
import com.gdgoc.babi_order.payment.entity.PaymentStatus;
import com.gdgoc.babi_order.payment.exception.TossPaymentException;
import com.gdgoc.babi_order.payment.reconciliation.dto.PaymentTossVerifyResponse;
import com.gdgoc.babi_order.payment.repository.PaymentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class PaymentTossVerifyServiceTest {

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private TossPaymentClient tossPaymentClient;

    @InjectMocks
    private PaymentTossVerifyService verifyService;

    @Test
    void matchesWhenStatusAndAmountEqual() {
        Payment payment = payment(1L, 10L, "key-1", PaymentStatus.DONE, 7500);
        given(paymentRepository.findById(1L)).willReturn(Optional.of(payment));
        TossPaymentClient.TossPaymentResponse toss = toss("DONE", 7500);
        given(tossPaymentClient.getPayment("key-1")).willReturn(toss);

        PaymentTossVerifyResponse response = verifyService.verify(1L);

        assertThat(response.isStatusMatches()).isTrue();
        assertThat(response.isAmountMatches()).isTrue();
        assertThat(response.getTossStatus()).isEqualTo("DONE");
        assertThat(response.getInternalAmount()).isEqualTo(7500);
        verify(paymentRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void statusMismatch() {
        Payment payment = payment(1L, 10L, "key-1", PaymentStatus.DONE, 7500);
        given(paymentRepository.findById(1L)).willReturn(Optional.of(payment));
        given(tossPaymentClient.getPayment("key-1")).willReturn(toss("CANCELED", 7500));

        PaymentTossVerifyResponse response = verifyService.verify(1L);

        assertThat(response.isStatusMatches()).isFalse();
        assertThat(response.isAmountMatches()).isTrue();
        assertThat(response.getTossStatus()).isEqualTo("CANCELED");
    }

    @Test
    void amountMismatch() {
        Payment payment = payment(1L, 10L, "key-1", PaymentStatus.DONE, 7500);
        given(paymentRepository.findById(1L)).willReturn(Optional.of(payment));
        given(tossPaymentClient.getPayment("key-1")).willReturn(toss("DONE", 7000));

        PaymentTossVerifyResponse response = verifyService.verify(1L);

        assertThat(response.isStatusMatches()).isTrue();
        assertThat(response.isAmountMatches()).isFalse();
    }

    @Test
    void tossErrorDoesNotMutatePayment() {
        Payment payment = payment(1L, 10L, "key-1", PaymentStatus.DONE, 7500);
        given(paymentRepository.findById(1L)).willReturn(Optional.of(payment));
        given(tossPaymentClient.getPayment("key-1")).willThrow(new TossPaymentException("조회 실패"));

        assertThatThrownBy(() -> verifyService.verify(1L))
                .isInstanceOf(ApiException.class)
                .extracting("code")
                .isEqualTo("TOSS_API_ERROR");
        verify(paymentRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void blankPaymentKeyFailsClearly() {
        Payment payment = payment(1L, 10L, "  ", PaymentStatus.DONE, 7500);
        given(paymentRepository.findById(1L)).willReturn(Optional.of(payment));

        assertThatThrownBy(() -> verifyService.verify(1L))
                .isInstanceOf(ApiException.class)
                .extracting("code")
                .isEqualTo("PAYMENT_KEY_MISSING");
        verify(tossPaymentClient, never()).getPayment(org.mockito.ArgumentMatchers.any());
    }

    private static Payment payment(
            Long id, Long orderId, String paymentKey, PaymentStatus status, int amount) {
        Order order = new Order(1);
        // id via reflection for lazy getOrder().getId()
        Payment built = Payment.builder()
                .order(order)
                .tossOrderId("toss")
                .paymentKey(paymentKey)
                .amount(amount)
                .status(status)
                .approvedAt(LocalDateTime.now())
                .methodLabel("카드")
                .build();
        setId(built, id);
        setId(order, orderId);
        return built;
    }

    private static TossPaymentClient.TossPaymentResponse toss(String status, int totalAmount) {
        TossPaymentClient.TossPaymentResponse response = new TossPaymentClient.TossPaymentResponse();
        try {
            var statusField = TossPaymentClient.TossPaymentResponse.class.getDeclaredField("status");
            statusField.setAccessible(true);
            statusField.set(response, status);
            var amountField = TossPaymentClient.TossPaymentResponse.class.getDeclaredField("totalAmount");
            amountField.setAccessible(true);
            amountField.set(response, totalAmount);
        } catch (ReflectiveOperationException exception) {
            throw new IllegalStateException(exception);
        }
        return response;
    }

    private static void setId(Object entity, Long id) {
        try {
            var field = entity.getClass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(entity, id);
        } catch (ReflectiveOperationException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
