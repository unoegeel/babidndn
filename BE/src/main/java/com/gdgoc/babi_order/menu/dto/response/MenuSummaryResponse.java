package com.gdgoc.babi_order.menu.dto.response;

import com.gdgoc.babi_order.menu.entity.Menu;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "메뉴 요약 정보")
public class MenuSummaryResponse {

    @Schema(description = "메뉴 ID", example = "1")
    private Long id;

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

    public static MenuSummaryResponse from(Menu menu) {
        return MenuSummaryResponse.builder()
                .id(menu.getId())
                .name(menu.getName())
                .description(menu.getDescription())
                .basePrice(menu.getBasePrice())
                .imageUrl(menu.getImageUrl())
                .displayOrder(menu.getDisplayOrder())
                .saleStatus(menu.getSaleStatus().name())
                .badge(badgeName(menu))
                .build();
    }

    private static String badgeName(Menu menu) {
        return menu.getBadge() == null ? "NONE" : menu.getBadge().name();
    }
}
