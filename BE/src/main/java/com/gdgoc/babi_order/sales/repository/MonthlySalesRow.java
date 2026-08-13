package com.gdgoc.babi_order.sales.repository;

public record MonthlySalesRow(int year, int month, long paymentCount, long totalAmount) {
}
