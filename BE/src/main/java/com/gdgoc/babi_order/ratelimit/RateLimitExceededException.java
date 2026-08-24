package com.gdgoc.babi_order.ratelimit;

import com.gdgoc.babi_order.common.exception.ApiException;
import org.springframework.http.HttpStatus;

/**
 * Expected client throttling — must not be recorded as backend_errors.
 */
public class RateLimitExceededException extends ApiException {

    public static final String CODE = "RATE_LIMIT_EXCEEDED";
    public static final String DEFAULT_MESSAGE = "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";

    private final long retryAfterSeconds;

    public RateLimitExceededException(long retryAfterSeconds) {
        super(HttpStatus.TOO_MANY_REQUESTS, CODE, DEFAULT_MESSAGE);
        this.retryAfterSeconds = Math.max(1L, retryAfterSeconds);
    }

    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}
