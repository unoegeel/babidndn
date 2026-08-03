package com.gdgoc.babi_order.order.exception;

import com.gdgoc.babi_order.menu.exception.MenuNotFoundException;
import com.gdgoc.babi_order.order.controller.OrderController;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;

@RestControllerAdvice(assignableTypes = OrderController.class)
public class OrderExceptionHandler {

    @ExceptionHandler(MenuNotFoundException.class)
    public ResponseEntity<OrderErrorResponse> handleMenuNotFound(MenuNotFoundException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new OrderErrorResponse(
                HttpStatus.NOT_FOUND.value(),
                "MENU_NOT_FOUND",
                exception.getMessage(),
                LocalDateTime.now()
        ));
    }

    @ExceptionHandler(OrderApiException.class)
    public ResponseEntity<OrderErrorResponse> handleOrderApiException(OrderApiException exception) {
        return ResponseEntity.status(exception.getStatus()).body(new OrderErrorResponse(
                exception.getStatus().value(),
                exception.getCode(),
                exception.getMessage(),
                LocalDateTime.now()
        ));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<OrderErrorResponse> handleValidation(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(error -> error.getDefaultMessage())
                .orElse("요청 값이 올바르지 않습니다.");
        return ResponseEntity.badRequest().body(new OrderErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "INVALID_REQUEST",
                message,
                LocalDateTime.now()
        ));
    }
}
