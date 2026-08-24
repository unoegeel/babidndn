package com.gdgoc.babi_order.ratelimit;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpMethod;
import org.springframework.web.servlet.HandlerInterceptor;

public class RateLimitInterceptor implements HandlerInterceptor {

    private final RateLimitProperties properties;
    private final RateLimitService rateLimitService;

    public RateLimitInterceptor(RateLimitProperties properties, RateLimitService rateLimitService) {
        this.properties = properties;
        this.rateLimitService = rateLimitService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!properties.isEnabled()) {
            return true;
        }
        if (HttpMethod.OPTIONS.matches(request.getMethod())) {
            return true;
        }
        HttpMethod method;
        try {
            method = HttpMethod.valueOf(request.getMethod());
        } catch (IllegalArgumentException ex) {
            return true;
        }
        RateLimitPolicy policy = RateLimitPolicy.match(method, resolvePath(request));
        if (policy == null) {
            return true;
        }
        rateLimitService.check(policy, request);
        return true;
    }

    private static String resolvePath(HttpServletRequest request) {
        String path = request.getServletPath();
        if (path == null || path.isBlank()) {
            path = request.getRequestURI();
            String context = request.getContextPath();
            if (context != null && !context.isEmpty() && path != null && path.startsWith(context)) {
                path = path.substring(context.length());
            }
        }
        return path;
    }
}
