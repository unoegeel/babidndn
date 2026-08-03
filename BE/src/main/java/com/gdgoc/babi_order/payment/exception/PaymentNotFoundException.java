package com.gdgoc.babi_order.payment.exception;

import org.springframework.http.HttpStatus;

public class PaymentNotFoundException extends PaymentApiException {

    private PaymentNotFoundException(String message) {
        super(HttpStatus.NOT_FOUND, "PAYMENT_NOT_FOUND", message);
    }

    public static PaymentNotFoundException byPaymentKey(String paymentKey) {
        return new PaymentNotFoundException("결제 정보를 찾을 수 없습니다. paymentKey=" + paymentKey);
    }

    public static PaymentNotFoundException byOrderId(Long orderId) {
        return new PaymentNotFoundException("해당 주문의 결제 정보를 찾을 수 없습니다. orderId=" + orderId);
    }
}
