package com.gdgoc.babi_order.dev.analytics;

import com.gdgoc.babi_order.common.time.StoreTime;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;

/**
 * Unified period for Developer Analytics.
 * Behavior events use Instant bounds; transactional/ops use Seoul LocalDateTime half-open ranges.
 */
public final class AnalyticsRange {

    private final Instant fromInstant;
    private final Instant toInstant;
    private final LocalDateTime fromLdtInclusive;
    private final LocalDateTime toLdtExclusive;

    private AnalyticsRange(Instant fromInstant, Instant toInstant,
                           LocalDateTime fromLdtInclusive, LocalDateTime toLdtExclusive) {
        this.fromInstant = fromInstant;
        this.toInstant = toInstant;
        this.fromLdtInclusive = fromLdtInclusive;
        this.toLdtExclusive = toLdtExclusive;
    }

    public static AnalyticsRange of(Instant from, Instant to) {
        Instant now = Instant.now();
        Instant fromResolved = from;
        Instant toResolved = to;
        if (fromResolved == null) {
            fromResolved = StoreTime.startOfToday().atZone(StoreTime.ZONE).toInstant();
        }
        if (toResolved == null) {
            toResolved = now;
        }
        LocalDateTime fromLdt = LocalDateTime.ofInstant(fromResolved, StoreTime.ZONE);
        LocalDateTime toLdt = LocalDateTime.ofInstant(toResolved, StoreTime.ZONE);
        // half-open exclusive end: bump by 1µs-equivalent via plusNanos so boundary inclusivity
        // for Instant event queries stays <= to; for LDT sales use next truncated second+
        LocalDateTime toExclusive = toLdt.plusSeconds(1);
        return new AnalyticsRange(fromResolved, toResolved, fromLdt, toExclusive);
    }

    /** Today (KST) 00:00 → now. */
    public static AnalyticsRange todayToNow() {
        return of(null, null);
    }

    public Instant fromInstant() {
        return fromInstant;
    }

    public Instant toInstant() {
        return toInstant;
    }

    public LocalDateTime fromLdtInclusive() {
        return fromLdtInclusive;
    }

    public LocalDateTime toLdtExclusive() {
        return toLdtExclusive;
    }

    public LocalDate fromDate() {
        return fromLdtInclusive.toLocalDate();
    }

    public LocalDate toDate() {
        return toInstant.atZone(StoreTime.ZONE).toLocalDate();
    }
}
