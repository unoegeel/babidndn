package com.gdgoc.babi_order.store.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@Schema(description = "매장 리뷰(고객 의견) 작성 요청")
public class StoreReviewCreateRequest {

    @NotBlank
    @Size(max = 1000)
    @Schema(description = "의견 내용", example = "음식이 맛있었어요. 포장도 깔끔합니다!")
    private String content;
}
