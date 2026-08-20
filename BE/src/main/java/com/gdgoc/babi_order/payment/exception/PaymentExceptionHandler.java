package com.gdgoc.babi_order.payment.exception;

import com.gdgoc.babi_order.backenderror.BackendErrorRecordService;
import com.gdgoc.babi_order.common.exception.ErrorResponse;
import com.gdgoc.babi_order.common.exception.ValidationErrorHelper;
import com.gdgoc.babi_order.common.logging.HttpErrorLogger;
import com.gdgoc.babi_order.payment.controller.PaymentController;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice(assignableTypes = PaymentController.class)
@RequiredArgsConstructor
public class PaymentExceptionHandler {

    private final BackendErrorRecordService backendErrorRecordService;

    @ExceptionHandler(TossPaymentException.class)
    public ResponseEntity<ErrorResponse> handleTossPaymentException(
            TossPaymentException exception,
            HttpServletRequest request
    ) {
        backendErrorRecordService.recordServerError(request, HttpStatus.BAD_GATEWAY, exception);
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(ErrorResponse.of(
                HttpStatus.BAD_GATEWAY,
                "TOSS_API_ERROR",
                exception.getMessage()
        ));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(
            MethodArgumentNotValidException exception,
            HttpServletRequest request
    ) {
        return ResponseEntity.badRequest().body(ValidationErrorHelper.from(exception, request));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingParameter(
            MissingServletRequestParameterException exception,
            HttpServletRequest request
    ) {
        HttpErrorLogger.logClientError(request, HttpStatus.BAD_REQUEST, exception);
        return ResponseEntity.badRequest().body(ErrorResponse.of(
                HttpStatus.BAD_REQUEST,
                "INVALID_REQUEST",
                "필수 파라미터가 누락되었습니다: " + exception.getParameterName()
        ));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(
            MethodArgumentTypeMismatchException exception,
            HttpServletRequest request
    ) {
        HttpErrorLogger.logClientError(request, HttpStatus.BAD_REQUEST, exception);
        return ResponseEntity.badRequest().body(ErrorResponse.of(
                HttpStatus.BAD_REQUEST,
                "INVALID_REQUEST",
                "파라미터 형식이 올바르지 않습니다: " + exception.getName()
        ));
    }
}
