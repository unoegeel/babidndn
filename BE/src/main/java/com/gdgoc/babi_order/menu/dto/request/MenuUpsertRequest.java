package com.gdgoc.babi_order.menu.dto.request;

import com.gdgoc.babi_order.menu.entity.MenuBadge;
import com.gdgoc.babi_order.menu.entity.SaleStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class MenuUpsertRequest {

    @NotNull(message = "카테고리 ID는 필수입니다.")
    @Positive(message = "카테고리 ID는 양수여야 합니다.")
    private Long categoryId;

    @NotBlank(message = "메뉴명은 필수입니다.")
    @Size(max = 100, message = "메뉴명은 100자 이하여야 합니다.")
    private String name;

    @Size(max = 500, message = "메뉴 설명은 500자 이하여야 합니다.")
    private String description;

    @NotNull(message = "기본 가격은 필수입니다.")
    @PositiveOrZero(message = "기본 가격은 0 이상이어야 합니다.")
    private Integer basePrice;

    @Size(max = 255, message = "이미지 URL은 255자 이하여야 합니다.")
    private String imageUrl;

    @NotNull(message = "표시 순서는 필수입니다.")
    @PositiveOrZero(message = "표시 순서는 0 이상이어야 합니다.")
    private Integer displayOrder;

    @NotNull(message = "판매 상태는 필수입니다.")
    private SaleStatus saleStatus;

    @NotNull(message = "토핑 가능 여부는 필수입니다.")
    private Boolean toppingEnabled;

    @NotNull(message = "메뉴 배지는 필수입니다.")
    private MenuBadge badge;
}
