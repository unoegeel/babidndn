package com.gdgoc.babi_order.common.logging;

import com.gdgoc.babi_order.clienterror.dto.ClientErrorReportRequest;
import com.gdgoc.babi_order.common.request.RequestIdSupport;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Frontend client error 리포트를 structured log로 남깁니다.
 */
public final class FrontendErrorLogger {

    private static final Logger log = LoggerFactory.getLogger(FrontendErrorLogger.class);

    private FrontendErrorLogger() {
    }

    public static void logClientError(HttpServletRequest request, ClientErrorReportRequest payload) {
        log.warn(
                "event=frontend_error trackingRequestId={} relatedRequestId={} source={} route={} errorName={} message={} browser={} platform={}{}",
                trackingRequestId(request),
                nullToDash(payload.getRelatedRequestId()),
                payload.getSource(),
                sanitize(payload.getRoute()),
                sanitize(payload.getErrorName()),
                sanitize(payload.getMessage()),
                nullToDash(payload.getBrowser()),
                nullToDash(payload.getPlatform()),
                principalSuffix()
        );
    }

    private static String trackingRequestId(HttpServletRequest request) {
        String fromMdc = MDC.get(RequestIdSupport.MDC_KEY);
        if (fromMdc != null) {
            return fromMdc;
        }
        return RequestIdSupport.resolve(request.getHeader(RequestIdSupport.HEADER_NAME));
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

    private static String nullToDash(String value) {
        return value == null || value.isBlank() ? "-" : value;
    }

    private static String sanitize(String value) {
        if (value == null) {
            return "-";
        }
        return value.replace('\n', ' ').replace('\r', ' ');
    }
}
