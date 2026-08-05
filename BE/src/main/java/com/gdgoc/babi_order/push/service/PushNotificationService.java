package com.gdgoc.babi_order.push.service;

import com.gdgoc.babi_order.push.config.PushProperties;
import com.gdgoc.babi_order.push.entity.PushSubscription;
import com.gdgoc.babi_order.push.repository.PushSubscriptionRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.apache.http.HttpResponse;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.Security;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PushNotificationService {

    private final PushProperties pushProperties;
    private final PushSubscriptionRepository subscriptionRepository;

    private PushService pushService;

    @PostConstruct
    void init() {
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
        if (!pushProperties.isEnabled() || !pushProperties.isConfigured()) {
            log.warn("Web Push 비활성 또는 VAPID 미설정 — 준비완료 푸시를 보내지 않습니다.");
            return;
        }
        try {
            // PushService(String publicKey, String privateKey, String subject)
            pushService = new PushService(
                    pushProperties.getPublicKey(),
                    pushProperties.getPrivateKey(),
                    pushProperties.getSubject()
            );
            log.info("Web Push(VAPID) 초기화 완료");
        } catch (Exception e) {
            log.error("Web Push 초기화 실패", e);
            pushService = null;
        }
    }

    @Transactional
    public void upsertSubscription(String endpoint, String p256dh, String auth) {
        subscriptionRepository.findByEndpoint(endpoint).ifPresentOrElse(
                existing -> existing.updateKeys(p256dh, auth),
                () -> subscriptionRepository.save(new PushSubscription(endpoint, p256dh, auth))
        );
    }

    @Transactional
    public void linkOrder(String endpoint, Long orderId) {
        PushSubscription subscription = subscriptionRepository.findByEndpoint(endpoint).orElse(null);
        if (subscription == null) {
            log.warn("주문 연결할 Push 구독이 없습니다. endpoint={}", truncate(endpoint));
            return;
        }
        subscription.linkOrder(orderId);
    }

    /**
     * 주문 준비완료(READY) / 재호출 시 해당 주문에 연결된 구독으로 Web Push를 보냅니다.
     * 발송 실패는 주문 상태 변경을 막지 않습니다.
     */
    @Transactional
    public void notifyOrderReady(Long orderId, int pickupNumber) {
        if (pushService == null) {
            return;
        }
        List<PushSubscription> subscriptions = subscriptionRepository.findByOrderId(orderId);
        if (subscriptions.isEmpty()) {
            log.debug("준비완료 푸시 대상 구독 없음. orderId={}", orderId);
            return;
        }

        String title = "바비든든";
        String body = pickupNumber + "번 주문이 준비되었습니다. 카운터에서 픽업해 주세요.";
        byte[] payload = buildReadyPayload(title, body, orderId).getBytes(StandardCharsets.UTF_8);

        for (PushSubscription sub : subscriptions) {
            try {
                Notification notification = new Notification(
                        sub.getEndpoint(),
                        sub.getP256dh(),
                        sub.getAuth(),
                        payload
                );
                HttpResponse response = pushService.send(notification);
                int status = response.getStatusLine().getStatusCode();
                if (status == HttpStatus.GONE.value() || status == HttpStatus.NOT_FOUND.value()) {
                    subscriptionRepository.delete(sub);
                    log.info("만료된 Push 구독 삭제. endpoint={}", truncate(sub.getEndpoint()));
                } else if (status < 200 || status >= 300) {
                    log.warn("Push 발송 실패 status={} endpoint={}", status, truncate(sub.getEndpoint()));
                }
            } catch (Exception e) {
                log.warn("Push 발송 예외 endpoint={}: {}", truncate(sub.getEndpoint()), e.getMessage());
            }
        }
    }

    public String getPublicKey() {
        return pushProperties.getPublicKey();
    }

    private static String buildReadyPayload(String title, String body, Long orderId) {
        return "{"
                + "\"title\":\"" + escapeJson(title) + "\","
                + "\"body\":\"" + escapeJson(body) + "\","
                + "\"orderId\":\"" + orderId + "\","
                + "\"type\":\"READY\""
                + "}";
    }

    private static String escapeJson(String value) {
        if (value == null) return "";
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }

    private static String truncate(String endpoint) {
        if (endpoint == null) return "";
        return endpoint.length() <= 48 ? endpoint : endpoint.substring(0, 48) + "...";
    }
}
