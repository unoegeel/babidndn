package com.gdgoc.babi_order.backenderror;

import com.gdgoc.babi_order.backenderror.entity.BackendError;
import com.gdgoc.babi_order.backenderror.repository.BackendErrorRepository;
import com.gdgoc.babi_order.common.logging.ErrorLogSupport;
import com.gdgoc.babi_order.common.logging.HttpErrorLogger;
import com.gdgoc.babi_order.common.request.RequestIdSupport;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class BackendErrorRecordService {

    private final BackendErrorRepository backendErrorRepository;

    /** 기존 HttpErrorLogger 동작을 유지하면서 Developer Console용 record를 저장한다. */
    @Transactional
    public void recordServerError(HttpServletRequest request, HttpStatus status, Exception exception) {
        HttpErrorLogger.logServerError(request, status, exception);
        backendErrorRepository.save(new BackendError(
                requestId(request),
                request.getMethod(),
                request.getRequestURI(),
                status.value(),
                exception.getClass().getName(),
                ErrorLogSupport.sanitizeSingleLine(safeMessage(exception)),
                ErrorLogSupport.stackTraceOf(exception),
                durationMs(request),
                principalName()
        ));
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
        return message;
    }

    private static String principalName() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            return null;
        }
        return authentication.getName();
    }
}
