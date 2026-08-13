package com.gdgoc.babi_order.order.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "매장 전체 대기 인원")
public class WaitingCountResponse {

    @Schema(description = "결제 완료된 PREPARING/READY 주문 수", example = "1")
    private Long waitingCount;
}
