package com.gdgoc.babi_order.httprequest;

import com.gdgoc.babi_order.common.logging.ErrorLogSupport;
import com.gdgoc.babi_order.common.logging.RequestAccessLogger;
import com.gdgoc.babi_order.common.request.RequestIdSupport;
import com.gdgoc.babi_order.httprequest.entity.HttpRequestRecord;
import com.gdgoc.babi_order.httprequest.repository.HttpRequestRecordRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RequestRecordService {

    private static final Logger log = LoggerFactory.getLogger(RequestRecordService.class);
    private static final String SSE_STREAM_PATH = "/api/orders/stream";

    private final HttpRequestRecordRepository httpRequestRecordRepository;

    /** 기존 access log 유지 + Developer Console용 record 저장 (실패해도 요청 처리에 영향 없음) */
    public void complete(HttpServletRequest request, HttpServletResponse response, long startNano) {
        RequestAccessLogger.logCompleted(request, response, startNano);
        try {
            persistIfApplicable(request, response, startNano);
        } catch (Exception exception) {
            log.debug("Request record persistence skipped: {}", exception.getMessage());
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void persistIfApplicable(HttpServletRequest request, HttpServletResponse response, long startNano) {
        String path = request.getRequestURI();
        if (shouldSkip(path)) {
            return;
        }

        String requestId = MDC.get(RequestIdSupport.MDC_KEY);
        if (requestId == null || requestId.isBlank()) {
            return;
        }

        long durationMs = Math.max(0L, (System.nanoTime() - startNano) / 1_000_000L);
        httpRequestRecordRepository.save(new HttpRequestRecord(
                requestId,
                request.getMethod(),
                path,
                response.getStatus(),
                durationMs,
                sanitizeUserAgent(request.getHeader("User-Agent"))
        ));
    }

    static boolean shouldSkip(String path) {
        if (path == null || path.isBlank()) {
            return true;
        }
        // SSE 장시간 연결은 connect 시점 duration만 기록되어 왜곡되므로 제외
        return SSE_STREAM_PATH.equals(path);
    }

    private static String sanitizeUserAgent(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) {
            return null;
        }
        return ErrorLogSupport.truncate(userAgent.trim(), 500);
    }
}
