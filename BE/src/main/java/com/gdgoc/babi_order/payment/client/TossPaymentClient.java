package com.gdgoc.babi_order.payment.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.gdgoc.babi_order.payment.config.TossPaymentProperties;
import com.gdgoc.babi_order.payment.exception.TossPaymentException;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class TossPaymentClient {

    private final RestTemplate restTemplate;
    private final TossPaymentProperties properties;

    private static final String PAYMENTS_URL = "/v1/payments";

    private HttpHeaders createHeaders() {
        String credentials = properties.getSecretKey() + ":";
        String encoded = Base64.getEncoder().encodeToString(credentials.getBytes(StandardCharsets.UTF_8));

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Basic " + encoded);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return headers;
    }

    public TossPaymentResponse confirm(String paymentKey, String orderId, Integer amount) {
        String url = properties.getBaseUrl() + PAYMENTS_URL + "/confirm";
        Map<String, Object> body = Map.of(
                "paymentKey", paymentKey,
                "orderId", orderId,
                "amount", amount
        );

        try {
            ResponseEntity<TossPaymentResponse> response = restTemplate.postForEntity(
                    url, new HttpEntity<>(body, createHeaders()), TossPaymentResponse.class);
            return response.getBody();
        } catch (HttpStatusCodeException e) {
            TossErrorResponse error = e.getResponseBodyAs(TossErrorResponse.class);
            throw new TossPaymentException(error != null ? error.getMessage() : "토스 결제 승인 실패");
        } catch (RestClientException e) {
            throw new TossPaymentException("토스 결제 서버와 통신에 실패했습니다.");
        }
    }

    public TossPaymentResponse cancel(String paymentKey, String cancelReason) {
        String url = properties.getBaseUrl() + PAYMENTS_URL + "/" + paymentKey + "/cancel";
        Map<String, Object> body = Map.of("cancelReason", cancelReason);

        try {
            ResponseEntity<TossPaymentResponse> response = restTemplate.postForEntity(
                    url, new HttpEntity<>(body, createHeaders()), TossPaymentResponse.class);
            return response.getBody();
        } catch (HttpStatusCodeException e) {
            TossErrorResponse error = e.getResponseBodyAs(TossErrorResponse.class);
            throw new TossPaymentException(error != null ? error.getMessage() : "토스 결제 취소 실패");
        } catch (RestClientException e) {
            throw new TossPaymentException("토스 결제 서버와 통신에 실패했습니다.");
        }
    }

    public TossPaymentResponse getPayment(String paymentKey) {
        String url = properties.getBaseUrl() + PAYMENTS_URL + "/" + paymentKey;

        try {
            ResponseEntity<TossPaymentResponse> response = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(createHeaders()), TossPaymentResponse.class);
            return response.getBody();
        } catch (HttpStatusCodeException e) {
            TossErrorResponse error = e.getResponseBodyAs(TossErrorResponse.class);
            throw new TossPaymentException(error != null ? error.getMessage() : "토스 결제 조회 실패");
        } catch (RestClientException e) {
            throw new TossPaymentException("토스 결제 서버와 통신에 실패했습니다.");
        }
    }

    /**
     * 토스 응답에서 화면 표시용 결제 수단 라벨을 만듭니다.
     * 예: 네이버페이, 토스페이, 카드(현대)
     */
    public static String formatMethodLabel(TossPaymentResponse response) {
        if (response == null) {
            return null;
        }
        if (response.getEasyPay() != null
                && response.getEasyPay().getProvider() != null
                && !response.getEasyPay().getProvider().isBlank()) {
            return normalizeEasyPayProvider(response.getEasyPay().getProvider());
        }
        if (response.getCard() != null
                || "카드".equals(response.getMethod())
                || "CARD".equalsIgnoreCase(response.getMethod())) {
            return "신용/체크카드";
        }
        if (response.getMethod() != null && !response.getMethod().isBlank()) {
            return response.getMethod();
        }
        return null;
    }

    private static String normalizeEasyPayProvider(String provider) {
        return switch (provider.trim()) {
            case "NAVERPAY", "네이버페이" -> "네이버페이";
            case "TOSSPAY", "토스페이" -> "토스페이";
            case "KAKAOPAY", "카카오페이" -> "카카오페이";
            case "PAYCO", "페이코" -> "페이코";
            case "SAMSUNGPAY", "삼성페이" -> "삼성페이";
            case "APPLEPAY", "애플페이" -> "애플페이";
            default -> provider.trim();
        };
    }

    @Getter
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class TossPaymentResponse {
        private String paymentKey;
        private String orderId;
        private String status;
        private String approvedAt;
        private Integer totalAmount;
        /** 카드 / 간편결제 / 가상계좌 등 */
        private String method;
        private Card card;
        private EasyPay easyPay;
    }

    @Getter
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Card {
        /** 카드사 한글명 (예: 현대) */
        private String company;
        private String issuerCode;
        private String acquirerCode;
        private String number;
    }

    @Getter
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class EasyPay {
        /** 네이버페이, 카카오페이, 토스페이, 페이코 등 */
        private String provider;
    }

    @Getter
    @NoArgsConstructor
    private static class TossErrorResponse {
        private String code;
        private String message;
    }
}
