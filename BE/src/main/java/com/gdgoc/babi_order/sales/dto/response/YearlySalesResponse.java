package com.gdgoc.babi_order.sales.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "연도별 매출")
public class YearlySalesResponse {

    @Schema(description = "매출 연도 (Asia/Seoul)", example = "2026")
    private Integer year;

    @Schema(description = "DONE 결제 건수", example = "1200")
    private Long paymentCount;

    @Schema(description = "DONE 결제 금액 합계", example = "12000000")
    private Long totalAmount;

    @Schema(description = "건당 평균 매출 (건수 0이면 0)", example = "10000")
    private Long averageAmount;
}
