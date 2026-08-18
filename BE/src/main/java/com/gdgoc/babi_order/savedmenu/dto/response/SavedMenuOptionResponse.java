package com.gdgoc.babi_order.savedmenu.dto.response;

import com.gdgoc.babi_order.savedmenu.entity.SavedMenuOption;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "나만의 메뉴 옵션")
public class SavedMenuOptionResponse {

    @Schema(description = "저장된 옵션 ID")
    private Long id;

    @Schema(description = "원본 메뉴 옵션 ID", nullable = true)
    private Long menuOptionId;

    @Schema(description = "옵션 그룹 스냅샷", example = "TOPPING_REMOVE", nullable = true)
    private String groupType;

    @Schema(description = "옵션명 스냅샷", example = "불닭소스 제외")
    private String name;

    @Schema(description = "추가 가격 스냅샷")
    private Integer additionalPrice;

    @Schema(description = "옵션 수량")
    private Integer quantity;

    @Schema(description = "표시 순서 스냅샷")
    private Integer displayOrder;

    public static SavedMenuOptionResponse from(SavedMenuOption option) {
        return SavedMenuOptionResponse.builder()
                .id(option.getId())
                .menuOptionId(option.getMenuOption() == null ? null : option.getMenuOption().getId())
                .groupType(option.getOptionGroupSnapshot() == null
                        ? null : option.getOptionGroupSnapshot().name())
                .name(option.getOptionNameSnapshot())
                .additionalPrice(option.getAdditionalPriceSnapshot())
                .quantity(option.getQuantity())
                .displayOrder(option.getDisplayOrderSnapshot())
                .build();
    }
}
