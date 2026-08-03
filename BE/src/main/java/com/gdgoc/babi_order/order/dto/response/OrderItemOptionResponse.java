package com.gdgoc.babi_order.order.dto.response;

import com.gdgoc.babi_order.order.entity.OrderItemOption;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "주문 상품에 선택된 옵션 정보")
public class OrderItemOptionResponse {

    @Schema(description = "주문 옵션 ID", example = "1")
    private Long id;

    @Schema(description = "메뉴 옵션 ID", example = "1")
    private Long menuOptionId;

    @Schema(description = "주문 시점 옵션 그룹 유형 스냅샷", example = "SIZE", nullable = true)
    private String groupType;

    @Schema(description = "주문 시점 옵션명 스냅샷", example = "곱빼기")
    private String name;

    @Schema(description = "주문 시점 추가 가격 스냅샷", example = "1000")
    private Integer additionalPrice;

    @Schema(description = "옵션 수량", example = "1")
    private Integer quantity;

    public static OrderItemOptionResponse from(OrderItemOption option) {
        return OrderItemOptionResponse.builder()
                .id(option.getId())
                .menuOptionId(option.getMenuOption() == null ? null : option.getMenuOption().getId())
                .groupType(option.getOptionGroupSnapshot() == null
                        ? null : option.getOptionGroupSnapshot().name())
                .name(option.getOptionNameSnapshot())
                .additionalPrice(option.getAdditionalPriceSnapshot())
                .quantity(option.getQuantity())
                .build();
    }
}
