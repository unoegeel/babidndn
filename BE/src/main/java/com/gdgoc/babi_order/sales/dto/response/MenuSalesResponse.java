package com.gdgoc.babi_order.sales.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "메뉴별 매출")
public class MenuSalesResponse {

    @Schema(description = "메뉴명 스냅샷", example = "삼겹소금")
    private String menuName;

    @Schema(description = "판매 수량 합계", example = "120")
    private Long itemQuantity;

    @Schema(description = "라인 금액 합계", example = "1200000")
    private Long totalAmount;
}
