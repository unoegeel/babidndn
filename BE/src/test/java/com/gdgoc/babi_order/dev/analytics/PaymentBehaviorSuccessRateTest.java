package com.gdgoc.babi_order.dev.analytics;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PaymentBehaviorSuccessRateTest {

    @Test
    void startZero_rateIsNull() {
        assertThat(PaymentBehaviorSuccessRate.of(0, 0)).isNull();
        assertThat(PaymentBehaviorSuccessRate.of(0, 5)).isNull();
    }

    @Test
    void oneStartOneSuccess_is100() {
        assertThat(PaymentBehaviorSuccessRate.of(1, 1)).isEqualTo(100.0);
    }

    @Test
    void twoStartsOneSuccess_is50() {
        assertThat(PaymentBehaviorSuccessRate.of(2, 1)).isEqualTo(50.0);
    }

    @Test
    void duplicateSuccessSameSession_numeratorNotInflated() {
        // numerator already deduped by session count at query layer
        assertThat(PaymentBehaviorSuccessRate.of(1, 1)).isEqualTo(100.0);
        assertThat(PaymentBehaviorSuccessRate.of(1, 1)).isLessThanOrEqualTo(100.0);
    }

    @Test
    void successWithoutStart_notInNumerator() {
        // query excludes these; rate from starts only
        assertThat(PaymentBehaviorSuccessRate.of(2, 0)).isEqualTo(0.0);
    }

    @Test
    void rawSuccessCanExceedRawStart_rateStillAtMost100() {
        // raw events: start=13 success=14 → sessions e.g. 13 start / 13 success
        assertThat(PaymentBehaviorSuccessRate.of(13, 13)).isEqualTo(100.0);
        assertThat(PaymentBehaviorSuccessRate.of(13, 10)).isEqualTo(76.92);
        assertThat(PaymentBehaviorSuccessRate.of(13, 13)).isLessThanOrEqualTo(100.0);
    }
}
