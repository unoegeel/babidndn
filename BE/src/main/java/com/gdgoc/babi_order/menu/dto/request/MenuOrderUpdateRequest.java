package com.gdgoc.babi_order.menu.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class MenuOrderUpdateRequest {

    @NotNull(message = "카테고리 ID는 필수입니다.")
    @Positive(message = "카테고리 ID는 양수여야 합니다.")
    private Long categoryId;

    @NotEmpty(message = "메뉴 ID 목록은 필수입니다.")
    private List<Long> menuIds;
}
