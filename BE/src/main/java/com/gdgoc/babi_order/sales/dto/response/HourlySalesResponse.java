package com.gdgoc.babi_order.sales.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "시간대별 주문 건수")
public class HourlySalesResponse {

    @Schema(description = "서울 기준 시(0~23)", example = "12")
    private Integer hour;

    @Schema(description = "해당 시간대 DONE 결제 건수", example = "12")
    private Long orderCount;
}
