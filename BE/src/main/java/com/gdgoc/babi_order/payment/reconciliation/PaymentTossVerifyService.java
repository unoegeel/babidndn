package com.gdgoc.babi_order.payment.reconciliation;

import com.gdgoc.babi_order.common.exception.ApiException;
import com.gdgoc.babi_order.payment.client.TossPaymentClient;
import com.gdgoc.babi_order.payment.entity.Payment;
import com.gdgoc.babi_order.payment.exception.TossPaymentException;
import com.gdgoc.babi_order.payment.reconciliation.dto.PaymentTossVerifyResponse;
import com.gdgoc.babi_order.payment.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Objects;

/**
 * Toss 단건 조회 diagnostics. Payment/Order를 변경하지 않는다.
 */
@Service
@RequiredArgsConstructor
public class PaymentTossVerifyService {

    private final PaymentRepository paymentRepository;
    private final TossPaymentClient tossPaymentClient;

    @Transactional(readOnly = true)
    public PaymentTossVerifyResponse verify(Long paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "PAYMENT_NOT_FOUND",
                        "결제를 찾을 수 없습니다."
                ));

        String paymentKey = payment.getPaymentKey();
        if (paymentKey == null || paymentKey.isBlank()) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "PAYMENT_KEY_MISSING",
                    "결제에 paymentKey가 없어 Toss 조회를 할 수 없습니다."
            );
        }

        TossPaymentClient.TossPaymentResponse toss;
        try {
            toss = tossPaymentClient.getPayment(paymentKey);
        } catch (TossPaymentException exception) {
            throw new ApiException(
                    HttpStatus.BAD_GATEWAY,
                    "TOSS_API_ERROR",
                    exception.getMessage()
            );
        }

        if (toss == null) {
            throw new ApiException(
                    HttpStatus.BAD_GATEWAY,
                    "TOSS_API_ERROR",
                    "토스 결제 조회 응답이 비어 있습니다."
            );
        }

        String internalStatus = payment.getStatus() != null ? payment.getStatus().name() : null;
        String tossStatus = toss.getStatus();
        Integer internalAmount = payment.getAmount();
        Integer tossAmount = toss.getTotalAmount();

        return PaymentTossVerifyResponse.builder()
                .paymentId(payment.getId())
                .orderId(payment.getOrder().getId())
                .internalStatus(internalStatus)
                .tossStatus(tossStatus)
                .internalAmount(internalAmount)
                .tossAmount(tossAmount)
                .statusMatches(Objects.equals(internalStatus, tossStatus))
                .amountMatches(Objects.equals(internalAmount, tossAmount))
                .verifiedAt(LocalDateTime.now(PaymentReconciliationService.STORE_ZONE))
                .build();
    }
}
