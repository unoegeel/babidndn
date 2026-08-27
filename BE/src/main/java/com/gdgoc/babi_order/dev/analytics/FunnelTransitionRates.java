package com.gdgoc.babi_order.dev.analytics;

/**
 * Funnel A→B conversion / drop-off rates.
 * When previous stage count is 0, rates are not computable (null) — never treat 0→0 as 100% conversion.
 */
final class FunnelTransitionRates {

    private FunnelTransitionRates() {
    }

    /**
     * @param stepIndex 0 = funnel entry (baseline 100% / 0%); &gt;0 = transition from previous stage
     * @param previousCount unique count of previous stage (ignored when stepIndex == 0)
     * @param currentCount unique count of current stage
     */
    static Rates of(int stepIndex, long previousCount, long currentCount) {
        if (stepIndex == 0) {
            return new Rates(100.0, 0.0);
        }
        if (previousCount <= 0) {
            return new Rates(null, null);
        }
        double conversion = round2((double) currentCount / previousCount * 100.0);
        double dropOff = round2(100.0 - conversion);
        return new Rates(conversion, dropOff);
    }

    /**
     * Prefer the transition with the highest drop-off among computable ones only.
     * Returns null when no transition has a non-null drop-off (e.g. all prior stages empty).
     */
    static String pickLargestDropOff(String previousEventType, String currentEventType,
                                     Double dropOffRate, String currentLargest, double currentLargestRate) {
        if (dropOffRate == null) {
            return currentLargest;
        }
        if (currentLargest == null || dropOffRate > currentLargestRate) {
            return previousEventType + " → " + currentEventType;
        }
        return currentLargest;
    }

    static double nextLargestRate(Double dropOffRate, double currentLargestRate) {
        if (dropOffRate == null) {
            return currentLargestRate;
        }
        if (currentLargestRate < 0 || dropOffRate > currentLargestRate) {
            return dropOffRate;
        }
        return currentLargestRate;
    }

    private static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }

    record Rates(Double stepConversion, Double dropOffRate) {
    }
}
