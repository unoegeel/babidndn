package com.gdgoc.babi_order.sales.service;

import com.gdgoc.babi_order.sales.dto.response.DailySalesResponse;
import com.gdgoc.babi_order.sales.dto.response.MenuSalesResponse;
import com.gdgoc.babi_order.sales.exception.SalesApiException;
import com.gdgoc.babi_order.sales.repository.DailySalesRow;
import com.gdgoc.babi_order.sales.repository.MenuSalesRow;
import com.gdgoc.babi_order.sales.repository.SalesQueryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

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

    public List<MenuSalesResponse> getMenuSales(LocalDate from, LocalDate to) {
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

    private static DailySalesResponse toDailyResponse(DailySalesRow row) {
        long paymentCount = row.paymentCount();
        long totalAmount = row.totalAmount();
        long averageAmount = paymentCount == 0 ? 0L : totalAmount / paymentCount;
        return DailySalesResponse.builder()
                .date(row.date())
                .paymentCount(paymentCount)
                .totalAmount(totalAmount)
                .averageAmount(averageAmount)
                .build();
    }

    private static MenuSalesResponse toMenuResponse(MenuSalesRow row) {
        return MenuSalesResponse.builder()
                .menuName(row.menuName())
                .itemQuantity(row.itemQuantity())
                .totalAmount(row.totalAmount())
                .build();
    }

    private record DateRange(LocalDateTime fromInclusive, LocalDateTime toExclusive) {
    }
}
