package com.gdgoc.babi_order.common.logging;

import com.gdgoc.babi_order.common.request.RequestIdSupport;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * 예외 처리 계층에서 requestId·HTTP 컨텍스트와 함께 구조화된 오류 로그를 남깁니다.
 * Authorization/JWT, body, 개인정보는 기록하지 않습니다.
 */
public final class HttpErrorLogger {

    private static final Logger log = LoggerFactory.getLogger(HttpErrorLogger.class);

    private HttpErrorLogger() {
    }

    public static void logClientError(HttpServletRequest request, HttpStatus status, Exception exception) {
        log.warn(
                "event=client_error requestId={} method={} path={} status={} exceptionClass={} message={} durationMs={}{}",
                requestId(request),
                request.getMethod(),
                request.getRequestURI(),
                status.value(),
                exception.getClass().getName(),
                safeMessage(exception),
                durationMs(request),
                principalSuffix()
        );
    }

    public static void logServerError(HttpServletRequest request, HttpStatus status, Exception exception) {
        log.error(
                "event=server_error requestId={} method={} path={} status={} exceptionClass={} message={} durationMs={}{}",
                requestId(request),
                request.getMethod(),
                request.getRequestURI(),
                status.value(),
                exception.getClass().getName(),
                safeMessage(exception),
                durationMs(request),
                principalSuffix(),
                exception
        );
    }

    private static String requestId(HttpServletRequest request) {
        String fromMdc = MDC.get(RequestIdSupport.MDC_KEY);
        if (fromMdc != null) {
            return fromMdc;
        }
        return RequestIdSupport.resolve(request.getHeader(RequestIdSupport.HEADER_NAME));
    }

    private static long durationMs(HttpServletRequest request) {
        Object startNano = request.getAttribute(RequestIdSupport.START_NANO_ATTRIBUTE);
        if (startNano instanceof Long start) {
            return (System.nanoTime() - start) / 1_000_000L;
        }
        return -1L;
    }

    private static String safeMessage(Exception exception) {
        String message = exception.getMessage();
        if (message == null || message.isBlank()) {
            return exception.getClass().getSimpleName();
        }
        return message.replace('\n', ' ').replace('\r', ' ');
    }

    private static String principalSuffix() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            return "";
        }
        return " principal=" + authentication.getName();
    }
}
