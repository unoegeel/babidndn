package com.gdgoc.babi_order.order.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

/**
 * 주문 접근 토큰 발급·해시 유틸.
 * raw token은 FE에만 전달하고, DB에는 SHA-256 hex만 저장한다.
 */
public final class OrderAccessTokens {

    private static final int RAW_BYTE_LENGTH = 32;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private OrderAccessTokens() {
    }

    /** URL-safe Base64(padding 없음) raw token */
    public static String generateRaw() {
        byte[] bytes = new byte[RAW_BYTE_LENGTH];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /** SHA-256 hex (64 chars) */
    public static String sha256Hex(String rawToken) {
        if (rawToken == null) {
            throw new IllegalArgumentException("rawToken must not be null");
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    /** constant-time 비교 */
    public static boolean matches(String rawToken, String storedHash) {
        if (rawToken == null || rawToken.isBlank() || storedHash == null || storedHash.isBlank()) {
            return false;
        }
        String actual = sha256Hex(rawToken.trim());
        return MessageDigest.isEqual(
                actual.getBytes(StandardCharsets.UTF_8),
                storedHash.trim().getBytes(StandardCharsets.UTF_8)
        );
    }
}
