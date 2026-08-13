package com.gdgoc.babi_order.sales.controller;

import com.gdgoc.babi_order.admin.security.AdminAuthenticationEntryPoint;
import com.gdgoc.babi_order.common.exception.ApiExceptionHandler;
import com.gdgoc.babi_order.config.CorsProperties;
import com.gdgoc.babi_order.config.SecurityConfig;
import com.gdgoc.babi_order.sales.dto.response.DailySalesResponse;
import com.gdgoc.babi_order.sales.dto.response.MenuSalesResponse;
import com.gdgoc.babi_order.sales.dto.response.MonthlySalesResponse;
import com.gdgoc.babi_order.sales.dto.response.WeeklySalesResponse;
import com.gdgoc.babi_order.sales.dto.response.YearlySalesResponse;
import com.gdgoc.babi_order.sales.exception.SalesApiException;
import com.gdgoc.babi_order.sales.exception.SalesExceptionHandler;
import com.gdgoc.babi_order.sales.service.SalesService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SalesController.class)
@Import({
        SecurityConfig.class,
        CorsProperties.class,
        SalesExceptionHandler.class,
        ApiExceptionHandler.class,
        AdminAuthenticationEntryPoint.class
})
@WithMockUser(roles = "ADMIN")
class SalesControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SalesService salesService;

    @Test
    void getDailySalesReturnsAggregates() throws Exception {
        given(salesService.getDailySales(LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 13)))
                .willReturn(List.of(DailySalesResponse.builder()
                        .date(LocalDate.of(2026, 8, 13))
                        .paymentCount(12L)
                        .totalAmount(120_000L)
                        .averageAmount(10_000L)
                        .build()));

        mockMvc.perform(get("/api/admin/sales/daily")
                        .param("from", "2026-08-01")
                        .param("to", "2026-08-13"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].date").value("2026-08-13"))
                .andExpect(jsonPath("$[0].paymentCount").value(12))
                .andExpect(jsonPath("$[0].totalAmount").value(120000))
                .andExpect(jsonPath("$[0].averageAmount").value(10000));
    }

    @Test
    void getMenuSalesReturnsAggregates() throws Exception {
        given(salesService.getMenuSales(LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 13)))
                .willReturn(List.of(MenuSalesResponse.builder()
                        .menuName("삼겹소금")
                        .itemQuantity(120L)
                        .totalAmount(1_200_000L)
                        .build()));

        mockMvc.perform(get("/api/admin/sales/by-menu")
                        .param("from", "2026-08-01")
                        .param("to", "2026-08-13"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].menuName").value("삼겹소금"))
                .andExpect(jsonPath("$[0].itemQuantity").value(120))
                .andExpect(jsonPath("$[0].totalAmount").value(1200000));
    }

    @Test
    void getWeeklySalesReturnsAggregates() throws Exception {
        given(salesService.getWeeklySales(LocalDate.of(2026, 8, 10), LocalDate.of(2026, 8, 16)))
                .willReturn(List.of(WeeklySalesResponse.builder()
                        .weekStart(LocalDate.of(2026, 8, 10))
                        .weekEnd(LocalDate.of(2026, 8, 16))
                        .paymentCount(20L)
                        .totalAmount(200_000L)
                        .averageAmount(10_000L)
                        .build()));

        mockMvc.perform(get("/api/admin/sales/weekly")
                        .param("from", "2026-08-10")
                        .param("to", "2026-08-16"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].weekStart").value("2026-08-10"))
                .andExpect(jsonPath("$[0].weekEnd").value("2026-08-16"))
                .andExpect(jsonPath("$[0].paymentCount").value(20));
    }

    @Test
    void getMonthlySalesReturnsAggregates() throws Exception {
        given(salesService.getMonthlySales())
                .willReturn(List.of(MonthlySalesResponse.builder()
                        .yearMonth("2026-05")
                        .paymentCount(120L)
                        .totalAmount(1_200_000L)
                        .averageAmount(10_000L)
                        .build()));

        mockMvc.perform(get("/api/admin/sales/monthly"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].yearMonth").value("2026-05"))
                .andExpect(jsonPath("$[0].paymentCount").value(120));
    }

    @Test
    void getYearlySalesReturnsAggregates() throws Exception {
        given(salesService.getYearlySales())
                .willReturn(List.of(YearlySalesResponse.builder()
                        .year(2026)
                        .paymentCount(1_100L)
                        .totalAmount(13_200_000L)
                        .averageAmount(12_000L)
                        .build()));

        mockMvc.perform(get("/api/admin/sales/yearly"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].year").value(2026))
                .andExpect(jsonPath("$[0].totalAmount").value(13_200_000));
    }

    @Test
    void getMenuSalesAllTimeOmitsDateParams() throws Exception {
        given(salesService.getMenuSales(null, null))
                .willReturn(List.of(MenuSalesResponse.builder()
                        .menuName("삼겹소금")
                        .itemQuantity(3L)
                        .totalAmount(10_500L)
                        .build()));

        mockMvc.perform(get("/api/admin/sales/by-menu"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].menuName").value("삼겹소금"));
    }

    @Test
    void rejectsMissingFrom() throws Exception {
        mockMvc.perform(get("/api/admin/sales/daily")
                        .param("to", "2026-08-13"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    void rejectsInvalidDate() throws Exception {
        mockMvc.perform(get("/api/admin/sales/daily")
                        .param("from", "2026-13-01")
                        .param("to", "2026-08-13"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    void rejectsFromAfterTo() throws Exception {
        given(salesService.getDailySales(any(), any()))
                .willThrow(new SalesApiException(
                        HttpStatus.BAD_REQUEST,
                        "INVALID_REQUEST",
                        "시작일은 종료일보다 이후일 수 없습니다."
                ));

        mockMvc.perform(get("/api/admin/sales/daily")
                        .param("from", "2026-08-13")
                        .param("to", "2026-08-01"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    @WithAnonymousUser
    void adminSalesRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/admin/sales/daily")
                        .param("from", "2026-08-01")
                        .param("to", "2026-08-13"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }
}
