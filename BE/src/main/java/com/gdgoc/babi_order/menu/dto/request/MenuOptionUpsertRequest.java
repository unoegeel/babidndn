package com.gdgoc.babi_order.menu.dto.request;

import com.gdgoc.babi_order.menu.entity.OptionGroupType;
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
public class MenuOptionUpsertRequest {

    private OptionGroupType groupType;

    @NotBlank(message = "옵션명은 필수입니다.")
    @Size(max = 100, message = "옵션명은 100자 이하여야 합니다.")
    private String name;

    @NotNull(message = "추가 가격은 필수입니다.")
    @PositiveOrZero(message = "추가 가격은 0 이상이어야 합니다.")
    private Integer additionalPrice;

    @NotNull(message = "최대 수량은 필수입니다.")
    @Positive(message = "최대 수량은 1 이상이어야 합니다.")
    private Integer maxQuantity;

    private boolean defaultSelected;

    @NotNull(message = "표시 순서는 필수입니다.")
    @PositiveOrZero(message = "표시 순서는 0 이상이어야 합니다.")
    private Integer displayOrder;
}
