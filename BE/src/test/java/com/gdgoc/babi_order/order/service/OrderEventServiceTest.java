package com.gdgoc.babi_order.order.service;

import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

class OrderEventServiceTest {

    @Test
    void streamPathAndTimeoutMatchIntendedSseLifecycle() {
        assertThat(OrderEventService.STREAM_PATH).isEqualTo("/api/orders/stream");
        assertThat(OrderEventService.SSE_TIMEOUT_MS).isEqualTo(30L * 60L * 1000L);
    }

    @Test
    void subscribeRegistersEmitter() {
        OrderEventService service = new OrderEventService();
        service.subscribe(60_000L);
        assertThat(service.activeEmitterCount()).isEqualTo(1);
    }

    @Test
    void cleanupTimedOutEmitterCompletesWithoutThrowing() {
        OrderEventService service = new OrderEventService();
        SseEmitter emitter = new SseEmitter(1_000L);
        assertThatCode(() -> service.cleanupTimedOutEmitter("emitter-1", emitter))
                .doesNotThrowAnyException();
        assertThatCode(() -> service.cleanupTimedOutEmitter("emitter-1", emitter))
                .doesNotThrowAnyException();
    }
}
