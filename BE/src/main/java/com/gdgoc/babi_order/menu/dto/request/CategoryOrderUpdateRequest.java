package com.gdgoc.babi_order.menu.dto.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class CategoryOrderUpdateRequest {

    @NotEmpty(message = "카테고리 ID 목록은 필수입니다.")
    private List<Long> categoryIds;
}
