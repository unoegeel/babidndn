package com.gdgoc.babi_order.store.exception;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(basePackages = "com.gdgoc.babi_order.store")
public class PopupAdExceptionHandler {

    @ExceptionHandler(PopupAdApiException.class)
    public ResponseEntity<PopupAdErrorResponse> handleApi(PopupAdApiException ex) {
        return ResponseEntity.status(ex.getStatus())
                .body(PopupAdErrorResponse.builder()
                        .code(ex.getCode())
                        .message(ex.getMessage())
                        .build());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<PopupAdErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(err -> err.getField() + ": " + err.getDefaultMessage())
                .orElse("요청 값이 올바르지 않습니다.");
        return ResponseEntity.badRequest()
                .body(PopupAdErrorResponse.builder()
                        .code("VALIDATION_ERROR")
                        .message(message)
                        .build());
    }
}
