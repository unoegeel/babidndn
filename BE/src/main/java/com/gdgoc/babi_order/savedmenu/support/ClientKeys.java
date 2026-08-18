package com.gdgoc.babi_order.savedmenu.support;

import com.gdgoc.babi_order.savedmenu.exception.SavedMenuApiException;
import org.springframework.http.HttpStatus;

import java.util.regex.Pattern;

public final class ClientKeys {

    public static final String HEADER = "X-Client-Key";
    private static final int MAX_LENGTH = 64;
    private static final Pattern UUID_PATTERN = Pattern.compile(
            "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
    );

    private ClientKeys() {
    }

    public static String require(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new SavedMenuApiException(
                    HttpStatus.BAD_REQUEST,
                    "MISSING_CLIENT_KEY",
                    "X-Client-Key 헤더가 필요합니다."
            );
        }
        String clientKey = raw.trim();
        if (clientKey.length() > MAX_LENGTH || !UUID_PATTERN.matcher(clientKey).matches()) {
            throw new SavedMenuApiException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_CLIENT_KEY",
                    "X-Client-Key 형식이 올바르지 않습니다."
            );
        }
        return clientKey;
    }
}
