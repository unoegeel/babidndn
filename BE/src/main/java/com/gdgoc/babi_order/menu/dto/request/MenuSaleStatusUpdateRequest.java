package com.gdgoc.babi_order.menu.dto.request;

import com.gdgoc.babi_order.menu.entity.SaleStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class MenuSaleStatusUpdateRequest {

    @NotNull(message = "판매 상태는 필수입니다.")
    private SaleStatus saleStatus;
}
