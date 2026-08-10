package com.gdgoc.babi_order.contact.exception;

import com.gdgoc.babi_order.common.exception.SimpleErrorResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(basePackages = "com.gdgoc.babi_order.contact")
public class ContactExceptionHandler {

    @ExceptionHandler(ContactApiException.class)
    public ResponseEntity<SimpleErrorResponse> handleApi(ContactApiException ex) {
        return ResponseEntity.status(ex.getStatus()).body(SimpleErrorResponse.from(ex));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<SimpleErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(err -> err.getField() + ": " + err.getDefaultMessage())
                .orElse("요청 값이 올바르지 않습니다.");
        return ResponseEntity.badRequest()
                .body(SimpleErrorResponse.of("VALIDATION_ERROR", message));
    }
}
