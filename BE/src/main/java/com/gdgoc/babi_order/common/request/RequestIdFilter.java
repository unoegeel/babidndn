package com.gdgoc.babi_order.common.request;

import com.gdgoc.babi_order.httprequest.RequestRecordService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * 모든 HTTP 요청에 requestId를 부여하고 MDC·응답 헤더에 연결합니다.
 */
public class RequestIdFilter extends OncePerRequestFilter {

    private final RequestRecordService requestRecordService;

    public RequestIdFilter(RequestRecordService requestRecordService) {
        this.requestRecordService = requestRecordService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String requestId = RequestIdSupport.resolve(request.getHeader(RequestIdSupport.HEADER_NAME));
        long startNano = System.nanoTime();
        request.setAttribute(RequestIdSupport.START_NANO_ATTRIBUTE, startNano);
        MDC.put(RequestIdSupport.MDC_KEY, requestId);
        response.setHeader(RequestIdSupport.HEADER_NAME, requestId);

        try {
            filterChain.doFilter(request, response);
        } finally {
            requestRecordService.complete(request, response, startNano);
            MDC.remove(RequestIdSupport.MDC_KEY);
        }
    }
}
