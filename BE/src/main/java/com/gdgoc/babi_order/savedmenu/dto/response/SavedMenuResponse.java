package com.gdgoc.babi_order.savedmenu.dto.response;

import com.gdgoc.babi_order.savedmenu.entity.SavedMenu;
import com.gdgoc.babi_order.savedmenu.entity.SavedMenuStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.util.Comparator;
import java.util.List;

@Getter
@Builder
@Schema(description = "나만의 메뉴")
public class SavedMenuResponse {

    @Schema(description = "나만의 메뉴 ID")
    private Long id;

    @Schema(description = "나만의 메뉴명")
    private String customName;

    @Schema(description = "원본 메뉴 ID", nullable = true)
    private Long menuId;

    @Schema(description = "원본 메뉴명 스냅샷")
    private String menuName;

    @Schema(description = "메뉴 이미지 스냅샷", nullable = true)
    private String menuImageUrl;

    @Schema(description = "메뉴 가격 스냅샷")
    private Integer menuPrice;

    @Schema(description = "상태", example = "AVAILABLE")
    private String status;

    @Schema(description = "저장 옵션")
    private List<SavedMenuOptionResponse> options;

    public static SavedMenuResponse of(SavedMenu savedMenu, SavedMenuStatus status) {
        List<SavedMenuOptionResponse> options = savedMenu.getOptions().stream()
                .sorted(Comparator.comparing(
                        option -> option.getDisplayOrderSnapshot() == null
                                ? Integer.MAX_VALUE : option.getDisplayOrderSnapshot()))
                .map(SavedMenuOptionResponse::from)
                .toList();
        return SavedMenuResponse.builder()
                .id(savedMenu.getId())
                .customName(savedMenu.getCustomName())
                .menuId(savedMenu.getMenu() == null ? null : savedMenu.getMenu().getId())
                .menuName(savedMenu.getMenuNameSnapshot())
                .menuImageUrl(savedMenu.getMenuImageUrlSnapshot())
                .menuPrice(savedMenu.getMenuPriceSnapshot())
                .status(status.name())
                .options(options)
                .build();
    }
}
