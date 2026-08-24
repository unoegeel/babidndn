package com.gdgoc.babi_order.ratelimit;

import com.gdgoc.babi_order.savedmenu.support.ClientKeys;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.regex.Pattern;

/**
 * X-Client-Key is a rate-limit identity hint only — never an authentication credential.
 * Invalid / oversized values are rejected so callers fall back to IP limiting.
 */
public final class RateLimitClientIdentity {

    private static final int MAX_LENGTH = 64;
    private static final Pattern UUID_PATTERN = Pattern.compile(
            "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
    );

    private RateLimitClientIdentity() {
    }

    /**
     * @return SHA-256 hex of a valid client key, or null if absent/invalid (use IP only)
     */
    public static String hashIfValid(String rawHeader) {
        if (!StringUtils.hasText(rawHeader)) {
            return null;
        }
        String trimmed = rawHeader.trim();
        if (trimmed.length() > MAX_LENGTH || !UUID_PATTERN.matcher(trimmed).matches()) {
            return null;
        }
        return sha256Hex(trimmed);
    }

    public static String headerName() {
        return ClientKeys.HEADER;
    }

    private static String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 not available", ex);
        }
    }
}
