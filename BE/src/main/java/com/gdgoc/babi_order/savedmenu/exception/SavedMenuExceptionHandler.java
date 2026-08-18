package com.gdgoc.babi_order.savedmenu.exception;

import com.gdgoc.babi_order.common.exception.ErrorResponse;
import com.gdgoc.babi_order.common.exception.ValidationErrorHelper;
import com.gdgoc.babi_order.savedmenu.controller.SavedMenuController;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = SavedMenuController.class)
public class SavedMenuExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException exception) {
        return ResponseEntity.badRequest().body(ValidationErrorHelper.from(exception));
    }
}
