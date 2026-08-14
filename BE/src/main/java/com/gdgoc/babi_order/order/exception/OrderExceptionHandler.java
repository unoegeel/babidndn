package com.gdgoc.babi_order.order.exception;

import com.gdgoc.babi_order.common.exception.ErrorResponse;
import com.gdgoc.babi_order.common.exception.ValidationErrorHelper;
import com.gdgoc.babi_order.order.controller.OrderController;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = OrderController.class)
public class OrderExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException exception) {
        return ResponseEntity.badRequest().body(ValidationErrorHelper.from(exception));
    }
}
