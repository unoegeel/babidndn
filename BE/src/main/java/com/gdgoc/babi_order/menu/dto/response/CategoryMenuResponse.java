package com.gdgoc.babi_order.menu.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
@Schema(description = "카테고리별 메뉴 목록")
public class CategoryMenuResponse {

    @Schema(description = "카테고리 ID", example = "1")
    private Long categoryId;

    @Schema(description = "카테고리명", example = "덮밥류")
    private String categoryName;

    @Schema(description = "카테고리 표시 순서", example = "1")
    private Integer displayOrder;

    @Schema(description = "카테고리에 속한 메뉴")
    private List<MenuSummaryResponse> menus;
}
