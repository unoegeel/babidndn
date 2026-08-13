package com.gdgoc.babi_order.sales.service;

import com.gdgoc.babi_order.sales.dto.response.DailySalesResponse;
import com.gdgoc.babi_order.sales.dto.response.HourlySalesResponse;
import com.gdgoc.babi_order.sales.dto.response.MenuSalesResponse;
import com.gdgoc.babi_order.sales.dto.response.MonthlySalesResponse;
import com.gdgoc.babi_order.sales.dto.response.WeeklySalesResponse;
import com.gdgoc.babi_order.sales.dto.response.YearlySalesResponse;
import com.gdgoc.babi_order.sales.exception.SalesApiException;
import com.gdgoc.babi_order.sales.repository.DailySalesRow;
import com.gdgoc.babi_order.sales.repository.HourlySalesRow;
import com.gdgoc.babi_order.sales.repository.MenuSalesRow;
import com.gdgoc.babi_order.sales.repository.MonthlySalesRow;
import com.gdgoc.babi_order.sales.repository.SalesQueryRepository;
import com.gdgoc.babi_order.sales.repository.WeeklySalesRow;
import com.gdgoc.babi_order.sales.repository.YearlySalesRow;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SalesService {

    private final SalesQueryRepository salesQueryRepository;

    public List<DailySalesResponse> getDailySales(LocalDate from, LocalDate to) {
        DateRange range = validateRange(from, to);
        return salesQueryRepository.findDailySales(range.fromInclusive(), range.toExclusive()).stream()
                .map(SalesService::toDailyResponse)
                .toList();
    }

    public List<WeeklySalesResponse> getWeeklySales(LocalDate from, LocalDate to) {
        DateRange range = validateWeekRange(from, to);
        return groupDailyByIsoWeek(
                salesQueryRepository.findDailySales(range.fromInclusive(), range.toExclusive()));
    }

    public List<MonthlySalesResponse> getMonthlySales() {
        return salesQueryRepository.findMonthlySales().stream()
                .map(SalesService::toMonthlyResponse)
                .toList();
    }

    public List<YearlySalesResponse> getYearlySales() {
        return salesQueryRepository.findYearlySales().stream()
                .map(SalesService::toYearlyResponse)
                .toList();
    }

    public List<HourlySalesResponse> getHourlySales(LocalDate from, LocalDate to) {
        DateRange range = validateRange(from, to);
        return padHourlyGaps(
                salesQueryRepository.findHourlySales(range.fromInclusive(), range.toExclusive()));
    }

    public List<MenuSalesResponse> getMenuSales(LocalDate from, LocalDate to) {
        if (from == null && to == null) {
            return salesQueryRepository.findMenuSalesAll().stream()
                    .map(SalesService::toMenuResponse)
                    .toList();
        }
        DateRange range = validateRange(from, to);
        return salesQueryRepository.findMenuSales(range.fromInclusive(), range.toExclusive()).stream()
                .map(SalesService::toMenuResponse)
                .toList();
    }

    private DateRange validateRange(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            throw new SalesApiException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_REQUEST",
                    "조회 기간(from, to)은 필수입니다."
            );
        }
        if (from.isAfter(to)) {
            throw new SalesApiException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_REQUEST",
                    "시작일은 종료일보다 이후일 수 없습니다."
            );
        }
        return new DateRange(from.atStartOfDay(), to.plusDays(1).atStartOfDay());
    }

    /** from/to를 각각 그 주의 월요일·일요일로 확장한 뒤 [월 00:00, 다음주 월 00:00) 로 조회한다. */
    private DateRange validateWeekRange(LocalDate from, LocalDate to) {
        validateRange(from, to);
        LocalDate weekFrom = from.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate weekTo = to.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
        return new DateRange(weekFrom.atStartOfDay(), weekTo.plusDays(1).atStartOfDay());
    }

    /** minHour~maxHour 사이 빈 시간을 0건으로 채운다. 데이터가 없으면 빈 목록. */
    private static List<HourlySalesResponse> padHourlyGaps(List<HourlySalesRow> rows) {
        if (rows.isEmpty()) {
            return List.of();
        }
        Map<Integer, Long> byHour = new LinkedHashMap<>();
        int minHour = 23;
        int maxHour = 0;
        for (HourlySalesRow row : rows) {
            byHour.put(row.hour(), row.orderCount());
            minHour = Math.min(minHour, row.hour());
            maxHour = Math.max(maxHour, row.hour());
        }
        List<HourlySalesResponse> padded = new ArrayList<>(maxHour - minHour + 1);
        for (int hour = minHour; hour <= maxHour; hour++) {
            padded.add(HourlySalesResponse.builder()
                    .hour(hour)
                    .orderCount(byHour.getOrDefault(hour, 0L))
                    .build());
        }
        return padded;
    }

    /** 일별 DONE 집계를 월요일~일요일 주로 합친다. 평균은 주 합계 기준. */
    private static List<WeeklySalesResponse> groupDailyByIsoWeek(List<DailySalesRow> dailyRows) {
        Map<LocalDate, long[]> byMonday = new LinkedHashMap<>();
        for (DailySalesRow row : dailyRows) {
            LocalDate monday = row.date().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            long[] totals = byMonday.computeIfAbsent(monday, key -> new long[2]);
            totals[0] += row.paymentCount();
            totals[1] += row.totalAmount();
        }
        return byMonday.entrySet().stream()
                .map(entry -> toWeeklyResponse(
                        new WeeklySalesRow(entry.getKey(), entry.getValue()[0], entry.getValue()[1])))
                .toList();
    }

    private static DailySalesResponse toDailyResponse(DailySalesRow row) {
        return DailySalesResponse.builder()
                .date(row.date())
                .paymentCount(row.paymentCount())
                .totalAmount(row.totalAmount())
                .averageAmount(average(row.paymentCount(), row.totalAmount()))
                .build();
    }

    private static WeeklySalesResponse toWeeklyResponse(WeeklySalesRow row) {
        return WeeklySalesResponse.builder()
                .weekStart(row.weekStart())
                .weekEnd(row.weekStart().plusDays(6))
                .paymentCount(row.paymentCount())
                .totalAmount(row.totalAmount())
                .averageAmount(average(row.paymentCount(), row.totalAmount()))
                .build();
    }

    private static MonthlySalesResponse toMonthlyResponse(MonthlySalesRow row) {
        return MonthlySalesResponse.builder()
                .yearMonth("%04d-%02d".formatted(row.year(), row.month()))
                .paymentCount(row.paymentCount())
                .totalAmount(row.totalAmount())
                .averageAmount(average(row.paymentCount(), row.totalAmount()))
                .build();
    }

    private static YearlySalesResponse toYearlyResponse(YearlySalesRow row) {
        return YearlySalesResponse.builder()
                .year(row.year())
                .paymentCount(row.paymentCount())
                .totalAmount(row.totalAmount())
                .averageAmount(average(row.paymentCount(), row.totalAmount()))
                .build();
    }

    private static MenuSalesResponse toMenuResponse(MenuSalesRow row) {
        return MenuSalesResponse.builder()
                .menuName(row.menuName())
                .itemQuantity(row.itemQuantity())
                .totalAmount(row.totalAmount())
                .build();
    }

    private static long average(long paymentCount, long totalAmount) {
        return paymentCount == 0 ? 0L : totalAmount / paymentCount;
    }

    private record DateRange(LocalDateTime fromInclusive, LocalDateTime toExclusive) {
    }
}
