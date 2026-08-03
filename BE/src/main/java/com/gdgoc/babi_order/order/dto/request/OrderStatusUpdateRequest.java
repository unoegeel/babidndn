package com.gdgoc.babi_order.order.dto.request;

import com.gdgoc.babi_order.order.entity.OrderStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "주문 상태 변경 요청")
public class OrderStatusUpdateRequest {

    @NotNull(message = "변경할 주문 상태는 필수입니다.")
    @Schema(description = "변경할 상태", example = "READY")
    private OrderStatus status;
}
