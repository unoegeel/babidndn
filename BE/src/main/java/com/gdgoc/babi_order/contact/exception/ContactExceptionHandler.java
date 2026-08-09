package com.gdgoc.babi_order.contact.exception;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(basePackages = "com.gdgoc.babi_order.contact")
public class ContactExceptionHandler {

    @ExceptionHandler(ContactApiException.class)
    public ResponseEntity<ContactErrorResponse> handleApi(ContactApiException ex) {
        return ResponseEntity.status(ex.getStatus())
                .body(ContactErrorResponse.builder()
                        .code(ex.getCode())
                        .message(ex.getMessage())
                        .build());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ContactErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(err -> err.getField() + ": " + err.getDefaultMessage())
                .orElse("요청 값이 올바르지 않습니다.");
        return ResponseEntity.badRequest()
                .body(ContactErrorResponse.builder()
                        .code("VALIDATION_ERROR")
                        .message(message)
                        .build());
    }
}
