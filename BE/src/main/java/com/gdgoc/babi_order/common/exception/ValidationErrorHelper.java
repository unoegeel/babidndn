package com.gdgoc.babi_order.common.exception;

import com.gdgoc.babi_order.common.logging.HttpErrorLogger;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;

/**
 * 그룹 A(admin/menu/order/payment) validation 오류 → ErrorResponse.
 * Contact/store(SimpleErrorResponse, VALIDATION_ERROR)는 사용하지 않는다.
 */
public final class ValidationErrorHelper {

    private ValidationErrorHelper() {
    }

    public static ErrorResponse from(MethodArgumentNotValidException exception) {
        return buildResponse(exception);
    }

    public static ErrorResponse from(MethodArgumentNotValidException exception, HttpServletRequest request) {
        ErrorResponse response = buildResponse(exception);
        HttpErrorLogger.logClientError(request, HttpStatus.BAD_REQUEST, exception);
        return response;
    }

    private static ErrorResponse buildResponse(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(error -> error.getDefaultMessage())
                .orElse("요청 값이 올바르지 않습니다.");
        return ErrorResponse.of(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", message);
    }
}
