package com.gdgoc.babi_order.admin.security;

import com.gdgoc.babi_order.admin.config.JwtProperties;
import com.gdgoc.babi_order.admin.entity.AdminRole;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class JwtTokenProvider {

    private static final String HEADER = encode("{\"alg\":\"HS256\",\"typ\":\"JWT\"}");
    private static final Base64.Encoder BASE64_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder BASE64_DECODER = Base64.getUrlDecoder();

    private final JwtProperties properties;
    private final ObjectMapper objectMapper;

    public String createToken(String loginId, AdminRole role) {
        validateSecret();
        long issuedAt = Instant.now().getEpochSecond();
        JwtClaims claims = new JwtClaims(
                loginId,
                role.name(),
                issuedAt,
                issuedAt + properties.getExpirationSeconds()
        );
        try {
            String payload = BASE64_ENCODER.encodeToString(
                    objectMapper.writeValueAsBytes(claims));
            String unsignedToken = HEADER + "." + payload;
            return unsignedToken + "." + sign(unsignedToken);
        } catch (Exception exception) {
            throw new IllegalStateException("관리자 토큰 생성에 실패했습니다.", exception);
        }
    }

    public Optional<JwtClaims> parseValidClaims(String token) {
        try {
            validateSecret();
            String[] parts = token.split("\\.");
            if (parts.length != 3) {
                return Optional.empty();
            }
            String unsignedToken = parts[0] + "." + parts[1];
            byte[] expected = BASE64_DECODER.decode(sign(unsignedToken));
            byte[] actual = BASE64_DECODER.decode(parts[2]);
            if (!MessageDigest.isEqual(expected, actual)) {
                return Optional.empty();
            }
            JwtClaims claims = objectMapper.readValue(
                    BASE64_DECODER.decode(parts[1]), JwtClaims.class);
            if (!isSupportedRole(claims.role())
                    || claims.exp() <= Instant.now().getEpochSecond()
                    || claims.sub() == null
                    || claims.sub().isBlank()) {
                return Optional.empty();
            }
            return Optional.of(claims);
        } catch (Exception exception) {
            return Optional.empty();
        }
    }

    public Optional<String> getValidLoginId(String token) {
        return parseValidClaims(token).map(JwtClaims::sub);
    }

    public long getExpirationSeconds() {
        return properties.getExpirationSeconds();
    }

    private static boolean isSupportedRole(String role) {
        return AdminRole.ADMIN.name().equals(role) || AdminRole.DEVELOPER.name().equals(role);
    }

    private String sign(String value) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(
                properties.getSecret().getBytes(StandardCharsets.UTF_8),
                "HmacSHA256"
        ));
        return BASE64_ENCODER.encodeToString(
                mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
    }

    private void validateSecret() {
        if (properties.getSecret() == null
                || properties.getSecret().getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("JWT_SECRET은 32바이트 이상이어야 합니다.");
        }
        if (properties.getExpirationSeconds() <= 0) {
            throw new IllegalStateException("JWT 만료 시간은 1초 이상이어야 합니다.");
        }
    }

    private static String encode(String value) {
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }

    public record JwtClaims(String sub, String role, long iat, long exp) {
    }
}
