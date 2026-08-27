package com.gdgoc.babi_order.dev.analytics;

/**
 * Payment behavior success rate from sequential sessions (not raw event counts).
 * rate = successfulStartThenSuccessSessions / startSessions * 100, or null if no starts.
 */
final class PaymentBehaviorSuccessRate {

    private PaymentBehaviorSuccessRate() {
    }

    static Double of(long paymentStartSessions, long startThenSuccessSessions) {
        if (paymentStartSessions <= 0) {
            return null;
        }
        double rate = (double) startThenSuccessSessions / paymentStartSessions * 100.0;
        return Math.round(rate * 100.0) / 100.0;
    }
}
