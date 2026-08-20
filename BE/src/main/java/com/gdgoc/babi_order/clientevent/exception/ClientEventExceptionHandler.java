package com.gdgoc.babi_order.clientevent.exception;

import com.gdgoc.babi_order.clientevent.ClientEventController;
import com.gdgoc.babi_order.common.exception.ErrorResponse;
import com.gdgoc.babi_order.common.exception.ValidationErrorHelper;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = ClientEventController.class)
public class ClientEventExceptionHandler {

    @ExceptionHandler(ClientEventApiException.class)
    public ResponseEntity<ErrorResponse> handleApi(ClientEventApiException exception) {
        return ResponseEntity.status(exception.getStatus()).body(ErrorResponse.from(exception));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(
            MethodArgumentNotValidException exception,
            HttpServletRequest request
    ) {
        return ResponseEntity.badRequest().body(ValidationErrorHelper.from(exception, request));
    }
}
