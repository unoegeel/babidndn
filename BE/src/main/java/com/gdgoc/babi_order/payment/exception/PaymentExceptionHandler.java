package com.gdgoc.babi_order.payment.exception;

import com.gdgoc.babi_order.payment.controller.PaymentController;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.time.LocalDateTime;

@RestControllerAdvice(assignableTypes = PaymentController.class)
public class PaymentExceptionHandler {

    @ExceptionHandler(PaymentApiException.class)
    public ResponseEntity<PaymentErrorResponse> handlePaymentApiException(PaymentApiException exception) {
        return ResponseEntity.status(exception.getStatus()).body(new PaymentErrorResponse(
                exception.getStatus().value(),
                exception.getCode(),
                exception.getMessage(),
                LocalDateTime.now()
        ));
    }

    @ExceptionHandler(TossPaymentException.class)
    public ResponseEntity<PaymentErrorResponse> handleTossPaymentException(TossPaymentException exception) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(new PaymentErrorResponse(
                HttpStatus.BAD_GATEWAY.value(),
                "TOSS_API_ERROR",
                exception.getMessage(),
                LocalDateTime.now()
        ));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<PaymentErrorResponse> handleValidation(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(error -> error.getDefaultMessage())
                .orElse("요청 값이 올바르지 않습니다.");
        return ResponseEntity.badRequest().body(new PaymentErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "INVALID_REQUEST",
                message,
                LocalDateTime.now()
        ));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<PaymentErrorResponse> handleMissingParameter(MissingServletRequestParameterException exception) {
        return ResponseEntity.badRequest().body(new PaymentErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "INVALID_REQUEST",
                "필수 파라미터가 누락되었습니다: " + exception.getParameterName(),
                LocalDateTime.now()
        ));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<PaymentErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException exception) {
        return ResponseEntity.badRequest().body(new PaymentErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "INVALID_REQUEST",
                "파라미터 형식이 올바르지 않습니다: " + exception.getName(),
                LocalDateTime.now()
        ));
    }
}
