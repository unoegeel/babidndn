package com.gdgoc.babi_order.common.time;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * Canonical store timestamps: Asia/Seoul wall-clock {@link LocalDateTime} (no offset stored).
 * <ul>
 *   <li>{@code Payment.approvedAt}: Toss OffsetDateTime → {@code atZoneSameInstant(Asia/Seoul)}</li>
 *   <li>{@code Order.createdAt} / {@code pickupAssignedAt} / {@code updatedAt}: {@link #now()}</li>
 *   <li>JDBC: {@code serverTimezone=Asia/Seoul}, {@code hibernate.jdbc.time_zone=Asia/Seoul}</li>
 * </ul>
 */
public final class StoreTime {

    public static final ZoneId ZONE = ZoneId.of("Asia/Seoul");

    private StoreTime() {
    }

    public static LocalDateTime now() {
        return LocalDateTime.now(ZONE);
    }

    public static LocalDate today() {
        return LocalDate.now(ZONE);
    }

    /** Inclusive start of the KST business day. */
    public static LocalDateTime startOfDay(LocalDate day) {
        return day.atStartOfDay();
    }

    /** Exclusive end of the KST business day (start of next day). */
    public static LocalDateTime startOfNextDay(LocalDate day) {
        return day.plusDays(1).atStartOfDay();
    }

    public static LocalDateTime startOfToday() {
        return startOfDay(today());
    }

    public static LocalDateTime startOfTomorrow() {
        return startOfNextDay(today());
    }
}
