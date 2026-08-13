package com.gdgoc.babi_order.sales.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@Builder
@Schema(description = "날짜별 매출")
public class DailySalesResponse {

    @Schema(description = "매출 날짜 (Asia/Seoul)", example = "2026-08-13")
    private LocalDate date;

    @Schema(description = "DONE 결제 건수", example = "12")
    private Long paymentCount;

    @Schema(description = "DONE 결제 금액 합계", example = "120000")
    private Long totalAmount;

    @Schema(description = "건당 평균 매출 (건수 0이면 0)", example = "10000")
    private Long averageAmount;
}
