package com.gdgoc.babi_order.menu.exception;

import com.gdgoc.babi_order.menu.controller.AdminMenuController;
import com.gdgoc.babi_order.menu.controller.MenuController;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.MethodArgumentNotValidException;

import java.time.LocalDateTime;

@RestControllerAdvice(assignableTypes = {MenuController.class, AdminMenuController.class})
public class MenuExceptionHandler {

    @ExceptionHandler(MenuApiException.class)
    public ResponseEntity<MenuErrorResponse> handleMenuApiException(MenuApiException exception) {
        return ResponseEntity.status(exception.getStatus()).body(new MenuErrorResponse(
                exception.getStatus().value(),
                exception.getCode(),
                exception.getMessage(),
                LocalDateTime.now()
        ));
    }

    @ExceptionHandler(MenuNotFoundException.class)
    public ResponseEntity<MenuErrorResponse> handleMenuNotFound(MenuNotFoundException exception) {
        MenuErrorResponse response = new MenuErrorResponse(
                HttpStatus.NOT_FOUND.value(),
                "MENU_NOT_FOUND",
                exception.getMessage(),
                LocalDateTime.now()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<MenuErrorResponse> handleValidation(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(error -> error.getDefaultMessage())
                .orElse("요청 값이 올바르지 않습니다.");
        return ResponseEntity.badRequest().body(new MenuErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "INVALID_REQUEST",
                message,
                LocalDateTime.now()
        ));
    }
}
