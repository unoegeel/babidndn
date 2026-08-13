package com.gdgoc.babi_order.sales.controller;

import com.gdgoc.babi_order.sales.dto.response.DailySalesResponse;
import com.gdgoc.babi_order.sales.dto.response.HourlySalesResponse;
import com.gdgoc.babi_order.sales.dto.response.MenuSalesResponse;
import com.gdgoc.babi_order.sales.dto.response.MonthlySalesResponse;
import com.gdgoc.babi_order.sales.dto.response.WeeklySalesResponse;
import com.gdgoc.babi_order.sales.dto.response.YearlySalesResponse;
import com.gdgoc.babi_order.sales.service.SalesService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/admin/sales")
@RequiredArgsConstructor
@Tag(name = "Admin Sales", description = "관리자 매출 분석 API")
public class SalesController {

    private final SalesService salesService;

    @GetMapping("/daily")
    @Operation(summary = "날짜별 매출 조회")
    public ResponseEntity<List<DailySalesResponse>> getDailySales(
            @RequestParam("from") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam("to") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(salesService.getDailySales(from, to));
    }

    @GetMapping("/weekly")
    @Operation(summary = "주별 매출 조회 (월요일~일요일)")
    public ResponseEntity<List<WeeklySalesResponse>> getWeeklySales(
            @RequestParam("from") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam("to") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(salesService.getWeeklySales(from, to));
    }

    @GetMapping("/monthly")
    @Operation(summary = "월별 매출 조회 (전체 기간)")
    public ResponseEntity<List<MonthlySalesResponse>> getMonthlySales() {
        return ResponseEntity.ok(salesService.getMonthlySales());
    }

    @GetMapping("/yearly")
    @Operation(summary = "연도별 매출 조회 (전체 기간)")
    public ResponseEntity<List<YearlySalesResponse>> getYearlySales() {
        return ResponseEntity.ok(salesService.getYearlySales());
    }

    @GetMapping("/by-hour")
    @Operation(summary = "시간대별 주문 건수 조회")
    public ResponseEntity<List<HourlySalesResponse>> getHourlySales(
            @RequestParam("from") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam("to") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(salesService.getHourlySales(from, to));
    }

    @GetMapping("/by-menu")
    @Operation(summary = "메뉴별 매출 조회 (from/to 생략 시 전체 기간)")
    public ResponseEntity<List<MenuSalesResponse>> getMenuSales(
            @RequestParam(value = "from", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(salesService.getMenuSales(from, to));
    }
}
