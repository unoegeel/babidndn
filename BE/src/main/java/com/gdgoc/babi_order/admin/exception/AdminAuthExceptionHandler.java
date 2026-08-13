package com.gdgoc.babi_order.admin.exception;

import com.gdgoc.babi_order.admin.controller.AdminAuthController;
import com.gdgoc.babi_order.common.exception.ErrorResponse;
import com.gdgoc.babi_order.common.exception.ValidationErrorHelper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = AdminAuthController.class)
public class AdminAuthExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(
            MethodArgumentNotValidException exception) {
        return ResponseEntity.badRequest().body(ValidationErrorHelper.from(exception));
    }
}
