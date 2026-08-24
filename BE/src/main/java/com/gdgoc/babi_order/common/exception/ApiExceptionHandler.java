package com.gdgoc.babi_order.common.exception;

import com.gdgoc.babi_order.backenderror.BackendErrorRecordService;
import com.gdgoc.babi_order.common.logging.HttpErrorLogger;
import com.gdgoc.babi_order.ratelimit.RateLimitExceededException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * ApiException → ErrorResponse(status/code/message/timestamp).
 * store/contact 의 SimpleErrorResponse 매핑은 더 높은 우선순위 도메인 핸들러가 담당합니다.
 */
@Order(Ordered.LOWEST_PRECEDENCE)
@RestControllerAdvice
public class ApiExceptionHandler {

    private final BackendErrorRecordService backendErrorRecordService;

    public ApiExceptionHandler(BackendErrorRecordService backendErrorRecordService) {
        this.backendErrorRecordService = backendErrorRecordService;
    }

    @ExceptionHandler(RateLimitExceededException.class)
    public ResponseEntity<ErrorResponse> handleRateLimitExceeded(
            RateLimitExceededException exception,
            HttpServletRequest request
    ) {
        HttpErrorLogger.logClientError(request, exception.getStatus(), exception);
        return ResponseEntity.status(exception.getStatus())
                .header(HttpHeaders.RETRY_AFTER, String.valueOf(exception.getRetryAfterSeconds()))
                .body(ErrorResponse.from(exception));
    }

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> handleApiException(
            ApiException exception,
            HttpServletRequest request
    ) {
        HttpErrorLogger.logClientError(request, exception.getStatus(), exception);
        return ResponseEntity.status(exception.getStatus()).body(ErrorResponse.from(exception));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpectedException(
            Exception exception,
            HttpServletRequest request
    ) {
        if (exception instanceof MethodArgumentNotValidException validationException) {
            return ResponseEntity.badRequest()
                    .body(ValidationErrorHelper.from(validationException, request));
        }
        if (exception instanceof MissingServletRequestParameterException missingParameterException) {
            HttpErrorLogger.logClientError(request, HttpStatus.BAD_REQUEST, missingParameterException);
            return ResponseEntity.badRequest().body(ErrorResponse.of(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_REQUEST",
                    "필수 파라미터가 누락되었습니다: " + missingParameterException.getParameterName()
            ));
        }
        if (exception instanceof MethodArgumentTypeMismatchException typeMismatchException) {
            HttpErrorLogger.logClientError(request, HttpStatus.BAD_REQUEST, typeMismatchException);
            return ResponseEntity.badRequest().body(ErrorResponse.of(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_REQUEST",
                    "파라미터 형식이 올바르지 않습니다: " + typeMismatchException.getName()
            ));
        }
        if (exception instanceof HttpMessageNotReadableException unreadableException) {
            HttpErrorLogger.logClientError(request, HttpStatus.BAD_REQUEST, unreadableException);
            return ResponseEntity.badRequest().body(ErrorResponse.of(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_REQUEST",
                    "요청 본문 형식이 올바르지 않습니다."
            ));
        }

        backendErrorRecordService.recordServerError(request, HttpStatus.INTERNAL_SERVER_ERROR, exception);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ErrorResponse.of(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "INTERNAL_SERVER_ERROR",
                "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
        ));
    }
}
