package com.gdgoc.babi_order.common.exception;

import com.gdgoc.babi_order.backenderror.BackendErrorRecordService;
import com.gdgoc.babi_order.common.logging.HttpErrorLogger;
import com.gdgoc.babi_order.order.service.OrderEventService;
import com.gdgoc.babi_order.ratelimit.RateLimitExceededException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.async.AsyncRequestTimeoutException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * ApiException → ErrorResponse(status/code/message/timestamp).
 * store/contact 의 SimpleErrorResponse 매핑은 더 높은 우선순위 도메인 핸들러가 담당합니다.
 */
@Order(Ordered.LOWEST_PRECEDENCE)
@RestControllerAdvice
public class ApiExceptionHandler {

    public static final String RESOURCE_NOT_FOUND_CODE = "RESOURCE_NOT_FOUND";
    public static final String RESOURCE_NOT_FOUND_MESSAGE = "요청한 리소스를 찾을 수 없습니다.";
    public static final String METHOD_NOT_ALLOWED_CODE = "METHOD_NOT_ALLOWED";
    public static final String METHOD_NOT_ALLOWED_MESSAGE = "지원하지 않는 HTTP 메서드입니다.";

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

    /**
     * Unmapped/static resource paths — client 404, not a server fault.
     * Must not fall through to {@link #handleUnexpectedException} (500 + backend_errors).
     */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoResourceFound(
            NoResourceFoundException exception,
            HttpServletRequest request
    ) {
        HttpErrorLogger.logClientError(request, HttpStatus.NOT_FOUND, exception);
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ErrorResponse.of(
                HttpStatus.NOT_FOUND,
                RESOURCE_NOT_FOUND_CODE,
                RESOURCE_NOT_FOUND_MESSAGE
        ));
    }

    /**
     * Wrong HTTP method on a mapped path — client 405, not a server fault.
     * Must not fall through to {@link #handleUnexpectedException} (500 + backend_errors).
     */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethodNotSupported(
            HttpRequestMethodNotSupportedException exception,
            HttpServletRequest request
    ) {
        HttpErrorLogger.logClientError(request, HttpStatus.METHOD_NOT_ALLOWED, exception);
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(ErrorResponse.of(
                HttpStatus.METHOD_NOT_ALLOWED,
                METHOD_NOT_ALLOWED_CODE,
                METHOD_NOT_ALLOWED_MESSAGE
        ));
    }

    /**
     * Admin order SSE ({@link OrderEventService#STREAM_PATH}) uses a 30-minute emitter timeout
     * as the normal reconnect lifecycle. That timeout surfaces as {@link AsyncRequestTimeoutException}
     * and must not be recorded as an unexpected backend failure.
     * Other async timeouts remain unexpected and are recorded.
     */
    @ExceptionHandler(AsyncRequestTimeoutException.class)
    public ResponseEntity<Void> handleAsyncRequestTimeout(
            AsyncRequestTimeoutException exception,
            HttpServletRequest request
    ) {
        if (isOrderSseStream(request)) {
            // Expected emitter reconnect lifecycle — no backend_errors row.
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
        }
        backendErrorRecordService.recordServerError(request, HttpStatus.SERVICE_UNAVAILABLE, exception);
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
    }

    static boolean isOrderSseStream(HttpServletRequest request) {
        return OrderEventService.STREAM_PATH.equals(request.getRequestURI());
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
