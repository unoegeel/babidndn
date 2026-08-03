package com.gdgoc.babi_order.menu.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class MenuImageUploadUrlRequest {

    @NotBlank(message = "Content-Type은 필수입니다.")
    @Pattern(
            regexp = "image/(jpeg|png|webp|gif)",
            message = "지원하지 않는 이미지 형식입니다. (jpeg, png, webp, gif만 허용)"
    )
    private String contentType;
}
