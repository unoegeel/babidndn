package com.gdgoc.babi_order.menu.dto.response;

import com.gdgoc.babi_order.menu.entity.MenuOption;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "메뉴 옵션 정보")
public class MenuOptionResponse {

    @Schema(description = "옵션 ID", example = "1")
    private Long id;

    @Schema(description = "옵션 그룹 유형", example = "SIZE", nullable = true)
    private String groupType;

    @Schema(description = "옵션명", example = "곱빼기")
    private String name;

    @Schema(description = "추가 가격", example = "1000")
    private Integer additionalPrice;

    @Schema(description = "최대 선택 수량", example = "1")
    private Integer maxQuantity;

    @Schema(description = "기본 선택 여부", example = "false")
    private boolean defaultSelected;

    @Schema(description = "표시 순서", example = "1")
    private Integer displayOrder;

    public static MenuOptionResponse from(MenuOption option) {
        return MenuOptionResponse.builder()
                .id(option.getId())
                .groupType(option.getGroupType() == null ? null : option.getGroupType().name())
                .name(option.getName())
                .additionalPrice(option.getAdditionalPrice())
                .maxQuantity(option.getMaxQuantity())
                .defaultSelected(option.isDefaultSelected())
                .displayOrder(option.getDisplayOrder())
                .build();
    }
}
