package com.gdgoc.babi_order.common.logging;

import com.gdgoc.babi_order.common.request.RequestIdSupport;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;

/**
 * 요청 lifecycle 완료 시 method/path/status/durationMs를 구조화해 남깁니다.
 * 민감 헤더·body는 기록하지 않습니다.
 */
public final class RequestAccessLogger {

    private static final Logger log = LoggerFactory.getLogger(RequestAccessLogger.class);

    private RequestAccessLogger() {
    }

    public static void logCompleted(HttpServletRequest request, HttpServletResponse response, long startNano) {
        int status = response.getStatus();
        long durationMs = (System.nanoTime() - startNano) / 1_000_000L;
        String requestId = MDC.get(RequestIdSupport.MDC_KEY);
        String method = request.getMethod();
        String path = request.getRequestURI();

        if (status >= 500) {
            log.error(
                    "event=request_completed requestId={} method={} path={} status={} durationMs={}",
                    requestId, method, path, status, durationMs
            );
            return;
        }
        if (status >= 400) {
            log.warn(
                    "event=request_completed requestId={} method={} path={} status={} durationMs={}",
                    requestId, method, path, status, durationMs
            );
            return;
        }
        log.info(
                "event=request_completed requestId={} method={} path={} status={} durationMs={}",
                requestId, method, path, status, durationMs
        );
    }
}
