package com.gdgoc.babi_order.savedmenu.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "나만의 메뉴 등록 요청")
public class SavedMenuCreateRequest {

    @NotNull(message = "메뉴 ID는 필수입니다.")
    @Positive(message = "메뉴 ID는 양수여야 합니다.")
    @Schema(description = "원본 메뉴 ID", example = "10")
    private Long menuId;

    @NotBlank(message = "나만의 메뉴명은 필수입니다.")
    @Size(max = 100, message = "나만의 메뉴명은 100자 이하여야 합니다.")
    @Schema(description = "목록에 표시될 나만의 메뉴명", example = "내 최애 우동")
    private String customName;

    @Valid
    @Schema(description = "선택한 옵션. 없으면 빈 배열")
    private List<SavedMenuOptionRequest> options;
}
