package com.gdgoc.babi_order.order.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "주문 상품 요청")
public class OrderItemRequest {

    @NotNull(message = "메뉴 ID는 필수입니다.")
    @Positive(message = "메뉴 ID는 양수여야 합니다.")
    @Schema(description = "메뉴 ID", example = "1")
    private Long menuId;

    @NotNull(message = "메뉴 수량은 필수입니다.")
    @Positive(message = "메뉴 수량은 1 이상이어야 합니다.")
    @Schema(description = "메뉴 수량", example = "2")
    private Integer quantity;

    @Valid
    @Schema(description = "선택 옵션. 옵션이 없으면 생략하거나 빈 배열을 전달합니다.")
    private List<OrderItemOptionRequest> options;
}
