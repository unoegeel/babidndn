package com.gdgoc.babi_order.dev.analytics;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class FunnelTransitionRatesTest {

    @Test
    void zeroToZero_isNotComputable() {
        FunnelTransitionRates.Rates rates = FunnelTransitionRates.of(1, 0, 0);
        assertThat(rates.stepConversion()).isNull();
        assertThat(rates.dropOffRate()).isNull();
    }

    @Test
    void tenToZero_isFullDropOff() {
        FunnelTransitionRates.Rates rates = FunnelTransitionRates.of(1, 10, 0);
        assertThat(rates.stepConversion()).isEqualTo(0.0);
        assertThat(rates.dropOffRate()).isEqualTo(100.0);
    }

    @Test
    void tenToFive_isHalf() {
        FunnelTransitionRates.Rates rates = FunnelTransitionRates.of(1, 10, 5);
        assertThat(rates.stepConversion()).isEqualTo(50.0);
        assertThat(rates.dropOffRate()).isEqualTo(50.0);
    }

    @Test
    void entryStep_keepsBaseline() {
        FunnelTransitionRates.Rates rates = FunnelTransitionRates.of(0, 0, 0);
        assertThat(rates.stepConversion()).isEqualTo(100.0);
        assertThat(rates.dropOffRate()).isEqualTo(0.0);
    }

    @Test
    void allZeroTransitions_noLargestDropOff() {
        String largest = null;
        double rate = -1;

        // MENU(0) → CART(0)
        FunnelTransitionRates.Rates t1 = FunnelTransitionRates.of(1, 0, 0);
        largest = FunnelTransitionRates.pickLargestDropOff("MENU_VIEW", "ADD_TO_CART", t1.dropOffRate(), largest, rate);
        rate = FunnelTransitionRates.nextLargestRate(t1.dropOffRate(), rate);

        // CART(0) → CHECKOUT(0)
        FunnelTransitionRates.Rates t2 = FunnelTransitionRates.of(2, 0, 0);
        largest = FunnelTransitionRates.pickLargestDropOff("ADD_TO_CART", "CHECKOUT_VIEW", t2.dropOffRate(), largest, rate);
        rate = FunnelTransitionRates.nextLargestRate(t2.dropOffRate(), rate);

        assertThat(largest).isNull();
        assertThat(rate).isEqualTo(-1);
    }

    @Test
    void partialFunnel_onlyComputableTransitionsCompete() {
        String largest = null;
        double rate = -1;

        // MENU(10) → CART(8) drop 20%
        FunnelTransitionRates.Rates t1 = FunnelTransitionRates.of(1, 10, 8);
        largest = FunnelTransitionRates.pickLargestDropOff("MENU_VIEW", "ADD_TO_CART", t1.dropOffRate(), largest, rate);
        rate = FunnelTransitionRates.nextLargestRate(t1.dropOffRate(), rate);

        // CART(8) → CHECKOUT(2) drop 75%  ← largest
        FunnelTransitionRates.Rates t2 = FunnelTransitionRates.of(2, 8, 2);
        largest = FunnelTransitionRates.pickLargestDropOff("ADD_TO_CART", "CHECKOUT_VIEW", t2.dropOffRate(), largest, rate);
        rate = FunnelTransitionRates.nextLargestRate(t2.dropOffRate(), rate);

        // CHECKOUT(2) → PAY(0) drop 100% ← new largest
        FunnelTransitionRates.Rates t3 = FunnelTransitionRates.of(3, 2, 0);
        largest = FunnelTransitionRates.pickLargestDropOff("CHECKOUT_VIEW", "PAYMENT_START", t3.dropOffRate(), largest, rate);
        rate = FunnelTransitionRates.nextLargestRate(t3.dropOffRate(), rate);

        // trailing empty after zero previous → ignored
        FunnelTransitionRates.Rates t4 = FunnelTransitionRates.of(4, 0, 0);
        largest = FunnelTransitionRates.pickLargestDropOff("PAYMENT_START", "X", t4.dropOffRate(), largest, rate);

        assertThat(largest).isEqualTo("CHECKOUT_VIEW → PAYMENT_START");
        assertThat(rate).isEqualTo(100.0);
    }

    @Test
    void earlyStageOnly_computesFirstDropThenStops() {
        String largest = null;
        double rate = -1;

        FunnelTransitionRates.Rates t1 = FunnelTransitionRates.of(1, 10, 0);
        largest = FunnelTransitionRates.pickLargestDropOff("MENU_VIEW", "ADD_TO_CART", t1.dropOffRate(), largest, rate);
        rate = FunnelTransitionRates.nextLargestRate(t1.dropOffRate(), rate);

        FunnelTransitionRates.Rates t2 = FunnelTransitionRates.of(2, 0, 0);
        largest = FunnelTransitionRates.pickLargestDropOff("ADD_TO_CART", "CHECKOUT_VIEW", t2.dropOffRate(), largest, rate);

        assertThat(t1.stepConversion()).isEqualTo(0.0);
        assertThat(t1.dropOffRate()).isEqualTo(100.0);
        assertThat(t2.stepConversion()).isNull();
        assertThat(largest).isEqualTo("MENU_VIEW → ADD_TO_CART");
    }
}
