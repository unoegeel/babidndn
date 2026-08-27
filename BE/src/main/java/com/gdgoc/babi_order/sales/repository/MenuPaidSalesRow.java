package com.gdgoc.babi_order.sales.repository;

public record MenuPaidSalesRow(
        Long menuId,
        String menuName,
        long paidQuantity,
        long paidRevenue,
        long paidOrderCount
) {
}
