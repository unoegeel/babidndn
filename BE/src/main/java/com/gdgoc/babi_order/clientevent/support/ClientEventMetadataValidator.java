package com.gdgoc.babi_order.clientevent.support;

import com.gdgoc.babi_order.clientevent.exception.ClientEventApiException;
import org.springframework.http.HttpStatus;

import java.util.Collection;
import java.util.Map;

public final class ClientEventMetadataValidator {

    public static final int MAX_METADATA_BYTES = 4096;
    public static final int MAX_METADATA_KEYS = 20;
    public static final int MAX_KEY_LENGTH = 50;
    public static final int MAX_STRING_VALUE_LENGTH = 500;

    private ClientEventMetadataValidator() {
    }

    public static Map<String, Object> validateAndNormalize(Map<String, Object> metadata) {
        if (metadata == null || metadata.isEmpty()) {
            return Map.of();
        }
        if (metadata.size() > MAX_METADATA_KEYS) {
            throw invalidRequest("metadata 키 개수는 최대 " + MAX_METADATA_KEYS + "개입니다.");
        }

        Map<String, Object> normalized = new java.util.LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : metadata.entrySet()) {
            String key = entry.getKey();
            if (key == null || key.isBlank()) {
                throw invalidRequest("metadata 키는 비어 있을 수 없습니다.");
            }
            if (key.length() > MAX_KEY_LENGTH) {
                throw invalidRequest("metadata 키 길이는 최대 " + MAX_KEY_LENGTH + "입니다.");
            }
            normalized.put(key, normalizeValue(key, entry.getValue()));
        }

        int serializedLength = ClientEventJsonSize.estimateBytes(normalized);
        if (serializedLength > MAX_METADATA_BYTES) {
            throw invalidRequest("metadata 크기는 최대 " + MAX_METADATA_BYTES + " bytes입니다.");
        }
        return Map.copyOf(normalized);
    }

    private static Object normalizeValue(String key, Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof String text) {
            if (text.length() > MAX_STRING_VALUE_LENGTH) {
                throw invalidRequest("metadata." + key + " 문자열 길이는 최대 "
                        + MAX_STRING_VALUE_LENGTH + "입니다.");
            }
            return text;
        }
        if (value instanceof Number || value instanceof Boolean) {
            return value;
        }
        if (value instanceof Collection<?> collection) {
            if (collection.size() > 20) {
                throw invalidRequest("metadata." + key + " 배열 크기는 최대 20입니다.");
            }
            java.util.List<Object> items = new java.util.ArrayList<>(collection.size());
            for (Object item : collection) {
                items.add(normalizeValue(key, item));
            }
            return items;
        }
        throw invalidRequest("metadata." + key + " 는 string/number/boolean/null/array(primitive)만 허용됩니다.");
    }

    private static ClientEventApiException invalidRequest(String message) {
        return new ClientEventApiException(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", message);
    }
}
