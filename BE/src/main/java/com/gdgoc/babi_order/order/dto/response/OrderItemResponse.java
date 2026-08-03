package com.gdgoc.babi_order.order.dto.response;

import com.gdgoc.babi_order.order.entity.OrderItem;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
@Schema(description = "주문 상품 정보")
public class OrderItemResponse {

    @Schema(description = "주문 상품 ID", example = "1")
    private Long id;

    @Schema(description = "메뉴 ID", example = "1")
    private Long menuId;

    @Schema(description = "주문 시점 메뉴명 스냅샷", example = "삼겹 제육 덮밥")
    private String menuName;

    @Schema(description = "주문 시점 메뉴 가격 스냅샷", example = "8000")
    private Integer menuPrice;

    @Schema(description = "수량", example = "2")
    private Integer quantity;

    @Schema(description = "해당 상품 합계 금액", example = "16000")
    private Integer lineAmount;

    @Schema(description = "선택 옵션 목록")
    private List<OrderItemOptionResponse> options;

    public static OrderItemResponse from(OrderItem item) {
        return OrderItemResponse.builder()
                .id(item.getId())
                .menuId(item.getMenu() == null ? null : item.getMenu().getId())
                .menuName(item.getMenuNameSnapshot())
                .menuPrice(item.getMenuPriceSnapshot())
                .quantity(item.getQuantity())
                .lineAmount(item.getLineAmount())
                .options(item.getOptions().stream().map(OrderItemOptionResponse::from).toList())
                .build();
    }
}
