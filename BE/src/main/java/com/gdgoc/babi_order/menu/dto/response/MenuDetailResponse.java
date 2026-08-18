package com.gdgoc.babi_order.menu.dto.response;

import com.gdgoc.babi_order.menu.entity.Menu;
import com.gdgoc.babi_order.menu.entity.MenuOption;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
@Schema(description = "메뉴 상세 정보")
public class MenuDetailResponse {

    @Schema(description = "메뉴 ID", example = "1")
    private Long id;

    @Schema(description = "카테고리 ID", example = "1")
    private Long categoryId;

    @Schema(description = "카테고리명", example = "덮밥류")
    private String categoryName;

    @Schema(description = "메뉴명", example = "삼겹 제육 덮밥")
    private String name;

    @Schema(description = "메뉴 설명", example = "제육 볶음을 올린 덮밥")
    private String description;

    @Schema(description = "기본 가격", example = "8000")
    private Integer basePrice;

    @Schema(description = "메뉴 이미지 URL", example = "https://babi-order-images.s3.ap-northeast-2.amazonaws.com/menu/550e8400-e29b-41d4-a716-446655440000.jpg")
    private String imageUrl;

    @Schema(description = "표시 순서", example = "1")
    private Integer displayOrder;

    @Schema(description = "판매 상태", example = "AVAILABLE")
    private String saleStatus;

    @Schema(description = "메뉴 배지", example = "NONE")
    private String badge;

    @Schema(description = "토핑 선택 가능 여부", example = "true")
    private boolean toppingEnabled;

    @Schema(description = "선택 가능한 옵션")
    private List<MenuOptionResponse> options;

    public static MenuDetailResponse of(Menu menu, List<MenuOption> options) {
        return MenuDetailResponse.builder()
                .id(menu.getId())
                .categoryId(menu.getCategory().getId())
                .categoryName(menu.getCategory().getName())
                .name(menu.getName())
                .description(menu.getDescription())
                .basePrice(menu.getBasePrice())
                .imageUrl(menu.getImageUrl())
                .displayOrder(menu.getDisplayOrder())
                .saleStatus(menu.getSaleStatus().name())
                .badge(menu.getBadge().name())
                .toppingEnabled(options.stream().anyMatch(option ->
                        option.getGroupType() == com.gdgoc.babi_order.menu.entity.OptionGroupType.TOPPING_ADD
                                || option.getGroupType()
                                == com.gdgoc.babi_order.menu.entity.OptionGroupType.TOPPING_REMOVE))
                .options(options.stream().map(MenuOptionResponse::from).toList())
                .build();
    }
}
