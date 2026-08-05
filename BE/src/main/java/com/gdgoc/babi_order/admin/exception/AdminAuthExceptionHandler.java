package com.gdgoc.babi_order.admin.exception;

import com.gdgoc.babi_order.admin.controller.AdminAuthController;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;

@RestControllerAdvice(assignableTypes = AdminAuthController.class)
public class AdminAuthExceptionHandler {

    @ExceptionHandler(AdminAuthException.class)
    public ResponseEntity<AdminAuthErrorResponse> handleAuth(AdminAuthException exception) {
        return ResponseEntity.status(exception.getStatus()).body(new AdminAuthErrorResponse(
                exception.getStatus().value(),
                exception.getCode(),
                exception.getMessage(),
                LocalDateTime.now()
        ));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<AdminAuthErrorResponse> handleValidation(
            MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(error -> error.getDefaultMessage())
                .orElse("요청 값이 올바르지 않습니다.");
        return ResponseEntity.badRequest().body(new AdminAuthErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "INVALID_REQUEST",
                message,
                LocalDateTime.now()
        ));
    }
}
