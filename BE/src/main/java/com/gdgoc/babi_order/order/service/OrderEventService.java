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

    private static final long SSE_TIMEOUT = 30L * 60L * 1000L;

    private final Map<String, SseEmitter> emitters = new ConcurrentHashMap<>();

    public SseEmitter subscribe() {
        String emitterId = UUID.randomUUID().toString();
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT);
        emitters.put(emitterId, emitter);

        emitter.onCompletion(() -> emitters.remove(emitterId));
        emitter.onTimeout(() -> emitters.remove(emitterId));
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
}
