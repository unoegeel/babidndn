package com.gdgoc.babi_order.common.request;

import java.util.UUID;
import java.util.regex.Pattern;

/**
 * HTTP 요청 추적용 requestId 정책.
 * 외부 {@value #HEADER_NAME} 값은 형식·길이를 검증한 뒤에만 재사용합니다.
 */
public final class RequestIdSupport {

    public static final String HEADER_NAME = "X-Request-Id";
    public static final String MDC_KEY = "requestId";
    public static final String START_NANO_ATTRIBUTE = "com.gdgoc.babi_order.request.startNano";

    private static final int MAX_LENGTH = 64;
    private static final Pattern VALID_REQUEST_ID = Pattern.compile("^[A-Za-z0-9_-]{1," + MAX_LENGTH + "}$");

    private RequestIdSupport() {
    }

    /**
     * 헤더 값이 유효하면 그대로, 아니면 새 UUID(v4)를 반환합니다.
     */
    public static String resolve(String headerValue) {
        if (headerValue == null || headerValue.isBlank()) {
            return generate();
        }
        String trimmed = headerValue.trim();
        if (containsControlCharacters(trimmed) || !VALID_REQUEST_ID.matcher(trimmed).matches()) {
            return generate();
        }
        return trimmed;
    }

    public static String generate() {
        return UUID.randomUUID().toString();
    }

    private static boolean containsControlCharacters(String value) {
        for (int i = 0; i < value.length(); i++) {
            if (Character.isISOControl(value.charAt(i))) {
                return true;
            }
        }
        return false;
    }
}
