package com.gdgoc.babi_order.store.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@Schema(description = "팝업 광고 이미지 업로드 URL 발급 요청")
public class PopupAdImageUploadUrlRequest {

    @NotBlank
    @Pattern(regexp = "image/(jpeg|png|webp|gif)", message = "지원하지 않는 이미지 형식입니다.")
    @Schema(description = "Content-Type", example = "image/jpeg")
    private String contentType;
}
