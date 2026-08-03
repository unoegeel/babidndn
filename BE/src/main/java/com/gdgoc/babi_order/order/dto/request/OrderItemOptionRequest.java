package com.gdgoc.babi_order.order.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "주문 옵션 요청")
public class OrderItemOptionRequest {

    @NotNull(message = "메뉴 옵션 ID는 필수입니다.")
    @Positive(message = "메뉴 옵션 ID는 양수여야 합니다.")
    @Schema(description = "메뉴 옵션 ID", example = "1")
    private Long menuOptionId;

    @NotNull(message = "옵션 수량은 필수입니다.")
    @Positive(message = "옵션 수량은 1 이상이어야 합니다.")
    @Schema(description = "메뉴 하나당 옵션 수량", example = "1")
    private Integer quantity;
}
