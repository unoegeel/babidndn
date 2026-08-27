package com.gdgoc.babi_order.order.service;

import com.gdgoc.babi_order.order.dto.response.OrderDetailResponse;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OrderEventService {

    /** Admin order SSE — intentional reconnect cadence (not an API latency sample). */
    public static final String STREAM_PATH = "/api/orders/stream";
    static final long SSE_TIMEOUT_MS = 30L * 60L * 1000L;

    private final Map<String, SseEmitter> emitters = new ConcurrentHashMap<>();

    public SseEmitter subscribe() {
        return subscribe(SSE_TIMEOUT_MS);
    }

    /** Visible for tests that must not wait the production timeout. */
    SseEmitter subscribe(long timeoutMs) {
        String emitterId = UUID.randomUUID().toString();
        SseEmitter emitter = new SseEmitter(timeoutMs);
        emitters.put(emitterId, emitter);

        emitter.onCompletion(() -> emitters.remove(emitterId));
        emitter.onTimeout(() -> cleanupTimedOutEmitter(emitterId, emitter));
        emitter.onError(exception -> emitters.remove(emitterId));

        try {
            emitter.send(SseEmitter.event()
                    .name("CONNECTED")
                    .data("order-stream-connected"));
        } catch (IOException exception) {
            emitters.remove(emitterId);
            emitter.completeWithError(exception);
        }
        return emitter;
    }

    public void publish(String eventName, OrderDetailResponse order) {
        emitters.forEach((emitterId, emitter) -> {
            try {
                emitter.send(SseEmitter.event()
                        .name(eventName)
                        .id(String.valueOf(order.getId()))
                        .data(order));
            } catch (Exception exception) {
                emitters.remove(emitterId);
                try {
                    emitter.complete();
                } catch (Exception ignored) {
                    // already completed
                }
            }
        });
    }

    /**
     * Expected SSE timeout: drop registration and complete the emitter so the
     * container treats reconnect as lifecycle end rather than an unexpected fault.
     */
    void cleanupTimedOutEmitter(String emitterId, SseEmitter emitter) {
        emitters.remove(emitterId);
        try {
            emitter.complete();
        } catch (Exception ignored) {
            // already completed / container closed
        }
    }

    int activeEmitterCount() {
        return emitters.size();
    }
}
