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
import com.gdgoc.babi_order.sales.repository.YearlySalesRow;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class SalesServiceTest {

    @Mock
    private SalesQueryRepository salesQueryRepository;

    private SalesService salesService;

    @BeforeEach
    void setUp() {
        salesService = new SalesService(salesQueryRepository);
    }

    @Test
    void getDailySalesMapsCountsAmountsAndAverage() {
        given(salesQueryRepository.findDailySales(any(), any())).willReturn(List.of(
                new DailySalesRow(LocalDate.of(2026, 8, 13), 12, 120_000)
        ));

        List<DailySalesResponse> result = salesService.getDailySales(
                LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 13));

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().getDate()).isEqualTo(LocalDate.of(2026, 8, 13));
        assertThat(result.getFirst().getPaymentCount()).isEqualTo(12L);
        assertThat(result.getFirst().getTotalAmount()).isEqualTo(120_000L);
        assertThat(result.getFirst().getAverageAmount()).isEqualTo(10_000L);
    }

    @Test
    void getDailySalesReturnsZeroAverageWhenPaymentCountIsZero() {
        given(salesQueryRepository.findDailySales(any(), any())).willReturn(List.of(
                new DailySalesRow(LocalDate.of(2026, 8, 13), 0, 0)
        ));

        List<DailySalesResponse> result = salesService.getDailySales(
                LocalDate.of(2026, 8, 13), LocalDate.of(2026, 8, 13));

        assertThat(result.getFirst().getAverageAmount()).isEqualTo(0L);
    }

    @Test
    void getDailySalesUsesInclusiveStartAndExclusiveNextDay() {
        given(salesQueryRepository.findDailySales(any(), any())).willReturn(List.of());

        salesService.getDailySales(LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 13));

        ArgumentCaptor<LocalDateTime> fromCaptor = ArgumentCaptor.forClass(LocalDateTime.class);
        ArgumentCaptor<LocalDateTime> toCaptor = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(salesQueryRepository).findDailySales(fromCaptor.capture(), toCaptor.capture());
        assertThat(fromCaptor.getValue()).isEqualTo(LocalDateTime.of(2026, 8, 1, 0, 0));
        assertThat(toCaptor.getValue()).isEqualTo(LocalDateTime.of(2026, 8, 14, 0, 0));
    }

    @Test
    void getWeeklySalesNormalizesToMondayThroughSundayAndGroupsDailyRows() {
        given(salesQueryRepository.findDailySales(any(), any())).willReturn(List.of(
                new DailySalesRow(LocalDate.of(2026, 8, 10), 2, 20_000),
                new DailySalesRow(LocalDate.of(2026, 8, 16), 1, 10_000),
                new DailySalesRow(LocalDate.of(2026, 8, 17), 1, 30_000)
        ));

        List<WeeklySalesResponse> result = salesService.getWeeklySales(
                LocalDate.of(2026, 8, 10), LocalDate.of(2026, 8, 17));

        assertThat(result).hasSize(2);
        assertThat(result.getFirst().getWeekStart()).isEqualTo(LocalDate.of(2026, 8, 10));
        assertThat(result.getFirst().getWeekEnd()).isEqualTo(LocalDate.of(2026, 8, 16));
        assertThat(result.getFirst().getPaymentCount()).isEqualTo(3L);
        assertThat(result.getFirst().getTotalAmount()).isEqualTo(30_000L);
        assertThat(result.getFirst().getAverageAmount()).isEqualTo(10_000L);
        assertThat(result.get(1).getWeekStart()).isEqualTo(LocalDate.of(2026, 8, 17));
        assertThat(result.get(1).getWeekEnd()).isEqualTo(LocalDate.of(2026, 8, 23));

        ArgumentCaptor<LocalDateTime> fromCaptor = ArgumentCaptor.forClass(LocalDateTime.class);
        ArgumentCaptor<LocalDateTime> toCaptor = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(salesQueryRepository).findDailySales(fromCaptor.capture(), toCaptor.capture());
        assertThat(fromCaptor.getValue()).isEqualTo(LocalDateTime.of(2026, 8, 10, 0, 0));
        assertThat(toCaptor.getValue()).isEqualTo(LocalDateTime.of(2026, 8, 24, 0, 0));
    }

    @Test
    void getMonthlySalesFormatsYearMonthAndAverage() {
        given(salesQueryRepository.findMonthlySales()).willReturn(List.of(
                new MonthlySalesRow(2026, 5, 120, 1_200_000)
        ));

        List<MonthlySalesResponse> result = salesService.getMonthlySales();

        assertThat(result.getFirst().getYearMonth()).isEqualTo("2026-05");
        assertThat(result.getFirst().getPaymentCount()).isEqualTo(120L);
        assertThat(result.getFirst().getAverageAmount()).isEqualTo(10_000L);
    }

    @Test
    void getYearlySalesMapsYearAndAverage() {
        given(salesQueryRepository.findYearlySales()).willReturn(List.of(
                new YearlySalesRow(2026, 1_100, 13_200_000)
        ));

        List<YearlySalesResponse> result = salesService.getYearlySales();

        assertThat(result.getFirst().getYear()).isEqualTo(2026);
        assertThat(result.getFirst().getAverageAmount()).isEqualTo(12_000L);
    }

    @Test
    void getHourlySalesPadsMissingHoursBetweenMinAndMax() {
        given(salesQueryRepository.findHourlySales(any(), any())).willReturn(List.of(
                new HourlySalesRow(9, 3),
                new HourlySalesRow(11, 7)
        ));

        List<HourlySalesResponse> result = salesService.getHourlySales(
                LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 7));

        assertThat(result).extracting(HourlySalesResponse::getHour).containsExactly(9, 10, 11);
        assertThat(result).extracting(HourlySalesResponse::getOrderCount).containsExactly(3L, 0L, 7L);
    }

    @Test
    void getHourlySalesReturnsEmptyWhenNoPayments() {
        given(salesQueryRepository.findHourlySales(any(), any())).willReturn(List.of());

        List<HourlySalesResponse> result = salesService.getHourlySales(
                LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 7));

        assertThat(result).isEmpty();
    }

    @Test
    void getMenuSalesMapsQuantityAndLineAmount() {
        given(salesQueryRepository.findMenuSales(any(), any())).willReturn(List.of(
                new MenuSalesRow("삼겹소금", 120, 1_200_000)
        ));

        List<MenuSalesResponse> result = salesService.getMenuSales(
                LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 13));

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().getMenuName()).isEqualTo("삼겹소금");
        assertThat(result.getFirst().getItemQuantity()).isEqualTo(120L);
        assertThat(result.getFirst().getTotalAmount()).isEqualTo(1_200_000L);
    }

    @Test
    void getMenuSalesWithoutRangeUsesAllTimeQuery() {
        given(salesQueryRepository.findMenuSalesAll()).willReturn(List.of(
                new MenuSalesRow("삼겹소금", 3, 10_500)
        ));

        List<MenuSalesResponse> result = salesService.getMenuSales(null, null);

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().getItemQuantity()).isEqualTo(3L);
        verify(salesQueryRepository).findMenuSalesAll();
    }

    @Test
    void rejectsNullFrom() {
        assertThatThrownBy(() -> salesService.getDailySales(null, LocalDate.of(2026, 8, 13)))
                .isInstanceOf(SalesApiException.class)
                .extracting("code")
                .isEqualTo("INVALID_REQUEST");
    }

    @Test
    void rejectsFromAfterTo() {
        assertThatThrownBy(() -> salesService.getDailySales(
                LocalDate.of(2026, 8, 13), LocalDate.of(2026, 8, 1)))
                .isInstanceOf(SalesApiException.class)
                .extracting("code")
                .isEqualTo("INVALID_REQUEST");
    }
}
