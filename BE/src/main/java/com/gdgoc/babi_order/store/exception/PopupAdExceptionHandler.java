package com.gdgoc.babi_order.store.exception;

import com.gdgoc.babi_order.common.exception.SimpleErrorResponse;
import com.gdgoc.babi_order.common.logging.HttpErrorLogger;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(basePackages = "com.gdgoc.babi_order.store")
public class PopupAdExceptionHandler {

    @ExceptionHandler(PopupAdApiException.class)
    public ResponseEntity<SimpleErrorResponse> handleApi(PopupAdApiException ex, HttpServletRequest request) {
        HttpErrorLogger.logClientError(request, ex.getStatus(), ex);
        return ResponseEntity.status(ex.getStatus()).body(SimpleErrorResponse.from(ex));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<SimpleErrorResponse> handleValidation(
            MethodArgumentNotValidException ex,
            HttpServletRequest request
    ) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(err -> err.getField() + ": " + err.getDefaultMessage())
                .orElse("요청 값이 올바르지 않습니다.");
        HttpErrorLogger.logClientError(request, HttpStatus.BAD_REQUEST, ex);
        return ResponseEntity.badRequest()
                .body(SimpleErrorResponse.of("VALIDATION_ERROR", message));
    }
}
