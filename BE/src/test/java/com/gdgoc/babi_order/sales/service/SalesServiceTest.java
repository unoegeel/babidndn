package com.gdgoc.babi_order.sales.service;

import com.gdgoc.babi_order.sales.dto.response.DailySalesResponse;
import com.gdgoc.babi_order.sales.dto.response.MenuSalesResponse;
import com.gdgoc.babi_order.sales.exception.SalesApiException;
import com.gdgoc.babi_order.sales.repository.DailySalesRow;
import com.gdgoc.babi_order.sales.repository.MenuSalesRow;
import com.gdgoc.babi_order.sales.repository.SalesQueryRepository;
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
