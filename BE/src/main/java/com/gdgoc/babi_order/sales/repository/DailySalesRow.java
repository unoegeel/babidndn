package com.gdgoc.babi_order.sales.repository;

import java.time.LocalDate;

public record DailySalesRow(LocalDate date, long paymentCount, long totalAmount) {
}
