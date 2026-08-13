package com.gdgoc.babi_order.sales.repository;

import java.time.LocalDate;

public record WeeklySalesRow(LocalDate weekStart, long paymentCount, long totalAmount) {
}
