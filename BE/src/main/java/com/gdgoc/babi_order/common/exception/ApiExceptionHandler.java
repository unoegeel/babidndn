package com.gdgoc.babi_order.common.exception;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * ApiException → ErrorResponse(status/code/message/timestamp).
 * store/contact 의 SimpleErrorResponse 매핑은 더 높은 우선순위 도메인 핸들러가 담당합니다.
 */
@Order(Ordered.LOWEST_PRECEDENCE)
@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> handleApiException(ApiException exception) {
        return ResponseEntity.status(exception.getStatus()).body(ErrorResponse.from(exception));
    }
}
