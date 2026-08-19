package com.gdgoc.babi_order.dev.error;

import com.gdgoc.babi_order.dev.error.exception.DeveloperErrorApiException;
import org.springframework.http.HttpStatus;

public final class DeveloperErrorId {

    private static final String FRONTEND_PREFIX = "frontend-";
    private static final String BACKEND_PREFIX = "backend-";

    private DeveloperErrorId() {
    }

    public static String frontendId(long id) {
        return FRONTEND_PREFIX + id;
    }

    public static String backendId(long id) {
        return BACKEND_PREFIX + id;
    }

    public static Parsed parse(String rawId) {
        if (rawId == null || rawId.isBlank()) {
            throw notFound();
        }
        if (rawId.startsWith(FRONTEND_PREFIX)) {
            return new Parsed(DeveloperErrorSource.FRONTEND, parseNumeric(rawId.substring(FRONTEND_PREFIX.length())));
        }
        if (rawId.startsWith(BACKEND_PREFIX)) {
            return new Parsed(DeveloperErrorSource.BACKEND, parseNumeric(rawId.substring(BACKEND_PREFIX.length())));
        }
        throw notFound();
    }

    private static long parseNumeric(String value) {
        try {
            long id = Long.parseLong(value);
            if (id <= 0) {
                throw notFound();
            }
            return id;
        } catch (NumberFormatException ex) {
            throw notFound();
        }
    }

    private static DeveloperErrorApiException notFound() {
        return new DeveloperErrorApiException(HttpStatus.NOT_FOUND, "ERROR_NOT_FOUND", "오류를 찾을 수 없습니다.");
    }

    public record Parsed(DeveloperErrorSource source, long numericId) {
    }
}
