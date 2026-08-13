package com.gdgoc.babi_order.sales.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@Builder
@Schema(description = "주별 매출 (월요일 ~ 일요일)")
public class WeeklySalesResponse {

    @Schema(description = "주 시작일 (월요일, Asia/Seoul)", example = "2026-08-10")
    private LocalDate weekStart;

    @Schema(description = "주 종료일 (일요일, Asia/Seoul)", example = "2026-08-16")
    private LocalDate weekEnd;

    @Schema(description = "DONE 결제 건수", example = "12")
    private Long paymentCount;

    @Schema(description = "DONE 결제 금액 합계", example = "120000")
    private Long totalAmount;

    @Schema(description = "건당 평균 매출 (건수 0이면 0)", example = "10000")
    private Long averageAmount;
}
