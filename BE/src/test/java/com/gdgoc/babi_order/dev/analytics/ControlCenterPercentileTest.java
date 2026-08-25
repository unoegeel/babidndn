package com.gdgoc.babi_order.dev.analytics;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ControlCenterPercentileTest {

    @Test
    void percentileAndAverage() {
        List<Long> values = List.of(10L, 20L, 30L, 40L, 50L, 60L, 70L, 80L, 90L, 100L);
        assertThat(ControlCenterQueryRepository.percentile(values, 0.50)).isEqualTo(50L);
        assertThat(ControlCenterQueryRepository.percentile(values, 0.95)).isEqualTo(100L);
        assertThat(ControlCenterQueryRepository.average(values)).isEqualTo(55.0);
        assertThat(ControlCenterQueryRepository.percentile(List.of(), 0.95)).isNull();
    }
}
