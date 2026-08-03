package com.gdgoc.babi_order.menu.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class CategoryUpsertRequest {

    @NotBlank(message = "카테고리명은 필수입니다.")
    @Size(max = 100, message = "카테고리명은 100자 이하여야 합니다.")
    private String name;

    @NotNull(message = "표시 순서는 필수입니다.")
    @PositiveOrZero(message = "표시 순서는 0 이상이어야 합니다.")
    private Integer displayOrder;
}
