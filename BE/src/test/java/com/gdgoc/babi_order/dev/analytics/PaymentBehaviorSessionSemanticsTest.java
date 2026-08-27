package com.gdgoc.babi_order.dev.analytics;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * In-memory mirror of ControlCenterQueryRepository payment start→success session SQL.
 * Guards sequential semantics that rate formula alone cannot express.
 */
class PaymentBehaviorSessionSemanticsTest {

    record Ev(String sessionId, String type, Instant at) {
    }

    static long startSessions(List<Ev> events) {
        Set<String> starts = new HashSet<>();
        for (Ev e : events) {
            if (e.sessionId == null || e.sessionId.isEmpty()) {
                continue;
            }
            if ("PAYMENT_START".equals(e.type)) {
                starts.add(e.sessionId);
            }
        }
        return starts.size();
    }

    static long startThenSuccessSessions(List<Ev> events) {
        Map<String, Instant> firstStart = new HashMap<>();
        for (Ev e : events) {
            if (e.sessionId == null || e.sessionId.isEmpty()) {
                continue;
            }
            if ("PAYMENT_START".equals(e.type)) {
                firstStart.merge(e.sessionId, e.at, (a, b) -> a.isBefore(b) ? a : b);
            }
        }
        Set<String> success = new HashSet<>();
        for (Ev e : events) {
            if (!"PAYMENT_SUCCESS".equals(e.type) || e.sessionId == null || e.sessionId.isEmpty()) {
                continue;
            }
            Instant start = firstStart.get(e.sessionId);
            if (start != null && !e.at.isBefore(start)) {
                success.add(e.sessionId);
            }
        }
        return success.size();
    }

    static long rawCount(List<Ev> events, String type) {
        return events.stream().filter(e -> type.equals(e.type)).count();
    }

    @Test
    void startZeroSuccessZero_rateNull() {
        List<Ev> events = List.of();
        long starts = startSessions(events);
        long ok = startThenSuccessSessions(events);
        assertThat(starts).isZero();
        assertThat(PaymentBehaviorSuccessRate.of(starts, ok)).isNull();
    }

    @Test
    void oneSessionStartThenSuccess_100() {
        Instant t0 = Instant.parse("2026-08-20T10:00:00Z");
        Instant t1 = Instant.parse("2026-08-20T10:01:00Z");
        List<Ev> events = List.of(
                new Ev("s1", "PAYMENT_START", t0),
                new Ev("s1", "PAYMENT_SUCCESS", t1)
        );
        assertThat(PaymentBehaviorSuccessRate.of(startSessions(events), startThenSuccessSessions(events)))
                .isEqualTo(100.0);
    }

    @Test
    void twoStartSessionsOneSuccess_50() {
        Instant t0 = Instant.parse("2026-08-20T10:00:00Z");
        Instant t1 = Instant.parse("2026-08-20T10:01:00Z");
        List<Ev> events = List.of(
                new Ev("s1", "PAYMENT_START", t0),
                new Ev("s1", "PAYMENT_SUCCESS", t1),
                new Ev("s2", "PAYMENT_START", t0)
        );
        assertThat(PaymentBehaviorSuccessRate.of(startSessions(events), startThenSuccessSessions(events)))
                .isEqualTo(50.0);
    }

    @Test
    void duplicateSuccessSameSession_numeratorOnce() {
        Instant t0 = Instant.parse("2026-08-20T10:00:00Z");
        Instant t1 = Instant.parse("2026-08-20T10:01:00Z");
        Instant t2 = Instant.parse("2026-08-20T10:02:00Z");
        List<Ev> events = List.of(
                new Ev("s1", "PAYMENT_START", t0),
                new Ev("s1", "PAYMENT_SUCCESS", t1),
                new Ev("s1", "PAYMENT_SUCCESS", t2)
        );
        assertThat(rawCount(events, "PAYMENT_SUCCESS")).isEqualTo(2);
        assertThat(startThenSuccessSessions(events)).isEqualTo(1);
        assertThat(PaymentBehaviorSuccessRate.of(startSessions(events), startThenSuccessSessions(events)))
                .isEqualTo(100.0);
    }

    @Test
    void successWithoutStart_inRawNotInNumerator() {
        Instant t0 = Instant.parse("2026-08-20T10:00:00Z");
        List<Ev> events = new ArrayList<>();
        events.add(new Ev("orphan", "PAYMENT_SUCCESS", t0));
        events.add(new Ev("s1", "PAYMENT_START", t0));
        assertThat(rawCount(events, "PAYMENT_SUCCESS")).isEqualTo(1);
        assertThat(startSessions(events)).isEqualTo(1);
        assertThat(startThenSuccessSessions(events)).isZero();
        assertThat(PaymentBehaviorSuccessRate.of(startSessions(events), startThenSuccessSessions(events)))
                .isEqualTo(0.0);
    }

    @Test
    void successBeforeStart_notSequentialUnlessLaterSuccess() {
        Instant t0 = Instant.parse("2026-08-20T10:00:00Z");
        Instant t1 = Instant.parse("2026-08-20T10:01:00Z");
        List<Ev> onlyBefore = List.of(
                new Ev("s1", "PAYMENT_SUCCESS", t0),
                new Ev("s1", "PAYMENT_START", t1)
        );
        assertThat(startSessions(onlyBefore)).isEqualTo(1);
        assertThat(startThenSuccessSessions(onlyBefore)).isZero();

        Instant t2 = Instant.parse("2026-08-20T10:02:00Z");
        List<Ev> beforeAndAfter = List.of(
                new Ev("s1", "PAYMENT_SUCCESS", t0),
                new Ev("s1", "PAYMENT_START", t1),
                new Ev("s1", "PAYMENT_SUCCESS", t2)
        );
        assertThat(startThenSuccessSessions(beforeAndAfter)).isEqualTo(1);
    }

    @Test
    void rawSuccessExceedsRawStart_rateAtMost100() {
        Instant t0 = Instant.parse("2026-08-20T10:00:00Z");
        Instant t1 = Instant.parse("2026-08-20T10:01:00Z");
        List<Ev> events = List.of(
                new Ev("s1", "PAYMENT_START", t0),
                new Ev("s1", "PAYMENT_SUCCESS", t1),
                new Ev("s1", "PAYMENT_SUCCESS", t1.plusSeconds(10)),
                new Ev("orphan", "PAYMENT_SUCCESS", t1)
        );
        assertThat(rawCount(events, "PAYMENT_START")).isEqualTo(1);
        assertThat(rawCount(events, "PAYMENT_SUCCESS")).isEqualTo(3);
        Double rate = PaymentBehaviorSuccessRate.of(startSessions(events), startThenSuccessSessions(events));
        assertThat(rate).isEqualTo(100.0);
        assertThat(rate).isLessThanOrEqualTo(100.0);
    }
}
