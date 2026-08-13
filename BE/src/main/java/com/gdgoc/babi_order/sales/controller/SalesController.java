package com.gdgoc.babi_order.sales.controller;

import com.gdgoc.babi_order.sales.dto.response.DailySalesResponse;
import com.gdgoc.babi_order.sales.dto.response.MenuSalesResponse;
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

    @GetMapping("/by-menu")
    @Operation(summary = "메뉴별 매출 조회")
    public ResponseEntity<List<MenuSalesResponse>> getMenuSales(
            @RequestParam("from") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam("to") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(salesService.getMenuSales(from, to));
    }
}
